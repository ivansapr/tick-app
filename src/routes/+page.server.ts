import { redirect } from "@sveltejs/kit";

export const load = async () => {
  // Redirect to login page by default
  // The (auth) layout will handle redirecting to calendar if authenticated
  throw redirect(307, "/login");
};
