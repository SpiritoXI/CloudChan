export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

