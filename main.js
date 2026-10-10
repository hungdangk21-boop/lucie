// Menu trượt, lọc gọng, trạng thái mở cửa của từng cửa hàng.

const icons = () => window.lucide?.createIcons();
document.addEventListener("DOMContentLoaded", icons);

// ===== Menu trượt (màn hẹp) =====
const drawer = document.getElementById("drawer");
const scrim = document.querySelector("[data-drawer-scrim]");
const menuButton = document.querySelector("[data-menu-open]");

function setDrawer(isOpen) {
  drawer.toggleAttribute("data-open", isOpen);
  scrim.toggleAttribute("data-open", isOpen);
  drawer.inert = !isOpen;
  menuButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) drawer.querySelector("a")?.focus();
}
menuButton.addEventListener("click", () => setDrawer(true));
scrim.addEventListener("click", () => setDrawer(false));
for (const link of drawer.querySelectorAll("a")) link.addEventListener("click", () => setDrawer(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && drawer.hasAttribute("data-open")) { setDrawer(false); menuButton.focus(); }
});

// ===== Lọc gọng: Tất cả / Kính cận / Kính râm =====
const frameFilter = document.querySelector("[data-frame-filter]");
frameFilter.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-filter]");
  if (!chip) return;
  for (const other of frameFilter.querySelectorAll("[data-filter]")) other.setAttribute("aria-checked", String(other === chip));
  for (const card of document.querySelectorAll("[data-frames] [data-kind]")) {
    card.hidden = chip.dataset.filter !== "all" && card.dataset.kind !== chip.dataset.filter;
  }
});

// ===== Trạng thái mở cửa =====
// data-hours trên mỗi cửa hàng: 7 cặp [mở, đóng] theo giờ Việt Nam, chỉ số 0 là Chủ nhật; null là nghỉ cả ngày.
const SHOP_TIME_ZONE = "Asia/Ho_Chi_Minh";
const CLOSING_SOON_MINUTES = 60;
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const STATUS_CLASSES = {
  open: { dot: "bg-success", label: "text-success" },
  closingSoon: { dot: "bg-warning", label: "text-warning" },
  closed: { dot: "bg-muted", label: "text-muted" },
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const formatTime = (time) => time.replace(/^0/, "");

function getShopNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function getStoreStatus(hours, now) {
  const today = hours[now.weekday];
  if (today) {
    const opensAt = toMinutes(today[0]);
    const closesAt = toMinutes(today[1]);
    if (now.minutes >= opensAt && now.minutes < closesAt) {
      return closesAt - now.minutes <= CLOSING_SOON_MINUTES
        ? { kind: "closingSoon", text: `Sắp đóng cửa · ${formatTime(today[1])}` }
        : { kind: "open", text: "Đang mở cửa" };
    }
    if (now.minutes < opensAt) return { kind: "closed", text: `Đã đóng · mở lại ${formatTime(today[0])} hôm nay` };
  }
  // Đã qua giờ đóng hôm nay (hoặc hôm nay nghỉ): tìm ngày mở cửa kế tiếp.
  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = (now.weekday + offset) % 7;
    const day = hours[weekday];
    if (!day) continue;
    const dayLabel = offset === 1 ? "ngày mai" : WEEKDAY_LABELS[weekday];
    return { kind: "closed", text: `Đã đóng · mở lại ${formatTime(day[0])} ${dayLabel}` };
  }
  return { kind: "closed", text: "Tạm đóng cửa" };
}

function updateStoreStatuses() {
  const now = getShopNow();
  for (const store of document.querySelectorAll("[data-hours]")) {
    const dot = store.querySelector("[data-status-dot]");
    const label = store.querySelector("[data-status-label]");
    if (!dot || !label) continue;
    let hours;
    try {
      hours = JSON.parse(store.dataset.hours);
    } catch {
      continue; // giờ viết sai thì giữ chữ tĩnh trong HTML
    }
    const status = getStoreStatus(hours, now);
    for (const classes of Object.values(STATUS_CLASSES)) {
      dot.classList.remove(classes.dot);
      label.classList.remove(classes.label);
    }
    dot.classList.add(STATUS_CLASSES[status.kind].dot);
    label.classList.add(STATUS_CLASSES[status.kind].label);
    label.textContent = status.text;
  }
}
updateStoreStatuses();
setInterval(updateStoreStatuses, 60_000);
