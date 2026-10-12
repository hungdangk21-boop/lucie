// Menu trượt, lọc gọng (loại + size, xem thêm trên màn hẹp, link #frames-*), trạng thái mở cửa của từng cửa hàng.

import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  CircleDot,
  Clock,
  createIcons,
  Droplet,
  Eye,
  Glasses,
  ImageOff,
  Layers,
  Link,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Wrench,
} from "lucide";

// Chỉ đóng gói icon trang dùng. Thêm data-lucide mới trong HTML thì thêm icon đó vào đây.
createIcons({
  icons: {
    ArrowRight, Briefcase, ChevronDown, CircleDot, Clock, Droplet, Eye, Glasses, ImageOff, Layers, Link, Mail,
    MapPin, Menu, MessageCircle, Phone, RotateCw, ShieldCheck, Sparkles, Star, Sun, Wrench,
  },
});

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

// ===== Lọc gọng: loại (chip cận / râm / trẻ em) và size (ô chọn hẹp / vừa / rộng) =====
// data-kind trên thẻ gọng có thể nhiều giá trị cách nhau bởi dấu cách, ví dụ "eye kids".
const filterBar = document.querySelector("[data-frame-filter]");
const grid = document.querySelector("[data-frames]");
const noMatch = document.querySelector('[data-state="no-match"]');
const countLabel = document.querySelector("[data-frame-count]");
const sizeSelect = document.querySelector('[data-facet-select="size"]');
const showMore = document.querySelector("[data-show-more]");
const moreCount = document.querySelector("[data-more-count]");
const facets = { kind: "all", size: "all" };
const FRAME_KINDS = ["eye", "sun", "kids"];

// Dưới lg lưới chỉ có 2 cột: hiện 4 mẫu đầu, phần còn lại sau nút "Xem thêm". Đổi bộ lọc thì thu gọn lại.
const narrowScreen = window.matchMedia("(max-width: 1023px)");
const COLLAPSED_LIMIT = 4;
let expanded = false;

function applyFacets() {
  const matches = [...grid.querySelectorAll("[data-kind]")].filter((card) => {
    const kindMatch = facets.kind === "all" || card.dataset.kind.split(" ").includes(facets.kind);
    const sizeMatch = facets.size === "all" || card.dataset.size === facets.size;
    return kindMatch && sizeMatch;
  });
  const limit = narrowScreen.matches && !expanded ? COLLAPSED_LIMIT : Infinity;
  for (const card of grid.querySelectorAll("[data-kind]")) card.hidden = !matches.slice(0, limit).includes(card);
  const hiddenCount = Math.max(0, matches.length - limit);
  showMore.hidden = hiddenCount === 0;
  moreCount.textContent = hiddenCount;
  grid.hidden = matches.length === 0;
  noMatch.hidden = matches.length !== 0;
  countLabel.textContent = `${matches.length} mẫu`;
}

document.querySelector('[data-action="show-more"]').addEventListener("click", () => {
  const cards = [...grid.querySelectorAll("[data-kind]")];
  const shownBefore = new Set(cards.filter((card) => !card.hidden));
  expanded = true;
  applyFacets();
  // Nút biến mất sau khi mở: chuyển focus vào mẫu đầu tiên vừa hiện để người dùng bàn phím không bị lạc.
  const firstRevealed = cards.find((card) => !card.hidden && !shownBefore.has(card));
  if (firstRevealed) {
    firstRevealed.tabIndex = -1;
    firstRevealed.focus({ preventScroll: true });
  }
});
narrowScreen.addEventListener("change", applyFacets);

function setFacet(facet, value) {
  facets[facet] = value;
  expanded = false;
  for (const chip of filterBar.querySelectorAll(`[data-facet="${facet}"]`)) {
    chip.setAttribute("aria-pressed", String(chip.dataset.value === value));
  }
  if (facet === "size") sizeSelect.value = value;
  applyFacets();
}

filterBar.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-facet]");
  if (!chip) return;
  setFacet(chip.dataset.facet, chip.dataset.value);
  if (chip.dataset.facet === "kind") history.replaceState(null, "", chip.dataset.value === "all" ? "#frames" : `#frames-${chip.dataset.value}`);
});

sizeSelect.addEventListener("change", () => setFacet("size", sizeSelect.value));

document.querySelector('[data-action="reset-facets"]').addEventListener("click", () => {
  setFacet("kind", "all");
  setFacet("size", "all");
  history.replaceState(null, "", "#frames");
  filterBar.querySelector("[data-facet]").focus();
});

// #frames-eye, #frames-sun, #frames-kids: mở lưới gọng đã lọc sẵn (menu, ô danh mục, link chia sẻ).
function openFramesFromHash() {
  const kind = location.hash.replace("#frames-", "");
  if (!FRAME_KINDS.includes(kind)) return;
  setFacet("size", "all");
  setFacet("kind", kind);
  document.getElementById("frames").scrollIntoView();
}

// Bấm lại cùng một link không đổi hash nên không có hashchange: tự xử lý click.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#frames-"]');
  if (!link) return;
  event.preventDefault();
  history.pushState(null, "", link.getAttribute("href"));
  openFramesFromHash();
});
window.addEventListener("popstate", openFramesFromHash);
applyFacets();
openFramesFromHash();

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
