import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const registered = searchParams?.registered === "1";
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : undefined;
  return <LoginForm registered={registered} callbackUrl={callbackUrl} />;
}
