import { prisma } from "@/lib/db";
import { guard } from "@/lib/page-guard";
import { getStaffShops, hasShopRole, requireShopAccess } from "@/lib/rbac";
import { NotificationBell } from "@/components/notifications/bell";
import { MobileNav, Sidebar, type NavGroup } from "@/components/pos/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LiveRefresh } from "@/components/live-refresh";
import { CallProvider } from "@/components/calls/call-provider";

export default async function PosShopLayout({ children, params }: LayoutProps<"/pos/[shopId]">) {
  const { shopId } = await params;
  const { user, access } = await guard(requireShopAccess(shopId), `/pos/${shopId}`);
  const base = `/pos/${shopId}`;

  const seesAllBookings = hasShopRole(access, ["OWNER", "SERVICE_ADVISOR", "PARTS", "QC"]);
  const isQc = hasShopRole(access, ["OWNER", "QC"]);
  const isParts = hasShopRole(access, ["OWNER", "PARTS"]);
  const isAdvisor = hasShopRole(access, ["OWNER", "SERVICE_ADVISOR"]);

  const [shops, pending, qcQueue, openAiTasks] = await Promise.all([
    getStaffShops(user.id),
    isAdvisor ? prisma.booking.count({ where: { shopId, status: "PENDING" } }) : 0,
    isQc ? prisma.booking.count({ where: { shopId, status: "QC_PENDING" } }) : 0,
    isAdvisor ? prisma.aiTask.count({ where: { shopId, done: false } }) : 0,
  ]);

  const groups: NavGroup[] = [
    { items: [{ href: base, label: "Overview", icon: "overview", exact: true }] },
    {
      label: "Workflow",
      items: [
        seesAllBookings
          ? { href: `${base}/bookings`, label: "Bookings", icon: "bookings", badge: pending }
          : { href: `${base}/bookings`, label: "My jobs", icon: "jobs" },
        ...(isQc ? [{ href: `${base}/qc`, label: "QC queue", icon: "qc" as const, badge: qcQueue }] : []),
        ...(isAdvisor
          ? [{ href: `${base}/calls`, label: "Calls & AI", icon: "calls" as const, badge: openAiTasks }]
          : []),
      ],
    },
    ...(isParts
      ? [
          {
            label: "Parts",
            items: [
              { href: `${base}/inventory`, label: "Inventory", icon: "inventory" as const },
              { href: `${base}/purchase-orders`, label: "Purchase orders", icon: "orders" as const },
            ],
          },
        ]
      : []),
    ...(access.isOwner
      ? [
          {
            label: "Shop",
            items: [
              { href: `${base}/team`, label: "Team", icon: "team" as const },
              { href: `${base}/services`, label: "Services", icon: "services" as const },
              { href: `${base}/settings`, label: "Settings", icon: "settings" as const },
            ],
          },
        ]
      : []),
  ];

  const navProps = {
    groups,
    shops,
    currentShopId: shopId,
    user: { name: user.name, email: user.email },
  };

  return (
    <CallProvider>
    <div className="flex min-h-screen">
      <Sidebar {...navProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav {...navProps} bell={<NotificationBell />} />
        <div className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-line/70 bg-ink/80 px-8 backdrop-blur-xl lg:flex">
          <span className="mr-auto text-sm text-muted-foreground">
            {access.shop.name} <span className="text-muted-foreground/50">·</span> {access.shop.city}
          </span>
          <ThemeToggle />
          <NotificationBell />
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        <LiveRefresh query={`shopId=${shopId}`} />
      </div>
    </div>
    </CallProvider>
  );
}
