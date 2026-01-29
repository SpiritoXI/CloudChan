const FILES_KEY = "my_crust_files";
const FOLDERS_KEY = "cc_folders";

async function upstashCommand(upstashUrl, upstashToken, command) {
  if (!upstashUrl || !upstashToken) {
    throw new Error("Upstash配置缺失");
  }

  const response = await fetch(upstashUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstashToken}`,
    },
    body: JSON.stringify(command),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Upstash错误: ${response.status}`);
  }

  return data.result;
}

function verifyAuth(request, env) {
  const authHeader = request.headers.get("x-auth-token");
  const expectedPassword = env.ADMIN_PASSWORD;
  return authHeader === expectedPassword;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  
  if (!verifyAuth(request, env)) {
    return new Response(
      JSON.stringify({ error: "未授权" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "load_files": {
        const result = await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["LRANGE", FILES_KEY, "0", "-1"]);
        const files = Array.isArray(result)
          ? result
              .map((item) => {
                try {
                  return JSON.parse(item);
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
          : [];
        return new Response(
          JSON.stringify({ success: true, data: files }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "load_folders": {
        const result = await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["HGETALL", FOLDERS_KEY]);
        const folders = [];
        if (Array.isArray(result)) {
          for (let i = 0; i < result.length; i += 2) {
            try {
              const folder = JSON.parse(result[i + 1]);
              folders.push(folder);
            } catch {
              // skip invalid folder
            }
          }
        }
        if (folders.length === 0) {
          const defaultFolder = {
            id: "default",
            name: "默认文件夹",
            parentId: null,
            createdAt: new Date().toLocaleString(),
          };
          await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, [
            "HSET",
            FOLDERS_KEY,
            "default",
            JSON.stringify(defaultFolder),
          ]);
          folders.push(defaultFolder);
        }
        return new Response(
          JSON.stringify({ success: true, data: folders }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "db_stats": {
        const [filesCount, foldersCount] = await Promise.all([
          upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["LLEN", FILES_KEY]),
          upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["HLEN", FOLDERS_KEY]),
        ]);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              keys: {
                files: { count: Number(filesCount) || 0 },
                folders: { count: Number(foldersCount) || 0 },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "未知操作" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "操作失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  if (!verifyAuth(request, env)) {
    return new Response(
      JSON.stringify({ error: "未授权" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    const body = await request.json();

    switch (action) {
      case "save_file": {
        await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["LPUSH", FILES_KEY, JSON.stringify(body)]);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "delete_file": {
        const files = await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["LRANGE", FILES_KEY, "0", "-1"]);
        if (Array.isArray(files)) {
          const index = files.findIndex((item) => {
            try {
              const file = JSON.parse(item);
              return file.id === body.fileId;
            } catch {
              return false;
            }
          });
          if (index >= 0) {
            await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, ["LREM", FILES_KEY, 0, files[index]]);
          }
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "create_folder": {
        const folder = {
          id: body.id || Date.now().toString(),
          name: body.name,
          parentId: body.parentId || null,
          createdAt: new Date().toLocaleString(),
        };
        await upstashCommand(env.UPSTASH_URL, env.UPSTASH_TOKEN, [
          "HSET",
          FOLDERS_KEY,
          folder.id,
          JSON.stringify(folder),
        ]);
        return new Response(
          JSON.stringify({ success: true, data: folder }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "未知操作" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "操作失败" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
