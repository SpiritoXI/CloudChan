"use client";

interface ShareFooterProps {
  cid: string;
}

export function ShareFooter({ cid }: ShareFooterProps) {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <p>Powered by Crust Network & IPFS</p>
          <p className="mt-2 md:mt-0">
            CID: {cid.slice(0, 20)}...{cid.slice(-10)}
          </p>
        </div>
      </div>
    </footer>
  );
}
