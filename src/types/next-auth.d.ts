import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isAdmin: boolean;
      tenantId: string | null;
      tenantSlug: string | null;
      tenantStatus: string | null;
      role: string | null;
    };
  }

  interface User {
    isAdmin?: boolean;
    tenantId?: string | null;
    tenantSlug?: string | null;
    tenantStatus?: string | null;
    role?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    tenantId?: string | null;
    tenantSlug?: string | null;
    tenantStatus?: string | null;
    role?: string | null;
  }
}
