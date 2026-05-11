import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-start py-16">
      <SignIn />
    </div>
  );
}
