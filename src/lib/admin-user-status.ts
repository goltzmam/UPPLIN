export type UserStatusAction = "suspend" | "ban" | "activate";

export function profileStatusForAction(action: UserStatusAction): "active" | "suspended" | "banned" {
  return action === "activate" ? "active" : action === "suspend" ? "suspended" : "banned";
}
