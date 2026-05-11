import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Logo from "@/components/Logo";

export default function Navbar() {
  return (
    <header className="h-14 border-b border-black/10 bg-white/70 backdrop-blur sticky top-0 z-40">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-semibold tracking-tight">DrawFlow</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/board"
            className="px-3 py-1.5 rounded-md hover:bg-black/5"
          >
            Board
          </Link>
          <Link
            href="/schema"
            className="px-3 py-1.5 rounded-md hover:bg-black/5"
          >
            Schema
          </Link>
          <SignedIn>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md hover:bg-black/5"
            >
              Dashboard
            </Link>
            <div className="ml-2">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 rounded-md hover:bg-black/5">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-3 py-1.5 rounded-md bg-ink text-white hover:opacity-90">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
