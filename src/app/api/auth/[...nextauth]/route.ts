import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions); // https://next-auth.js.org/configuration/callbacks

export { handler as GET, handler as POST };
