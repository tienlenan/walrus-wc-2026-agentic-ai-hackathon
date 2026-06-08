// Danh tính người dùng (MVP): id ổn định trong localStorage → memory bám theo.
// Sau này thay bằng địa chỉ ví Sui.
const KEY = "daily-walrus:resourceId";

export function getResourceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "reader-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}
