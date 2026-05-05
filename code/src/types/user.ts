export const USER_ROLES = [
  "home_cook",
  "verified_chef",
  "local_supplier",
  "admin",
] as const;

export const REGISTERABLE_USER_ROLES = [
  "home_cook",
  "verified_chef",
  "local_supplier",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type RegisterableUserRole = (typeof REGISTERABLE_USER_ROLES)[number];
