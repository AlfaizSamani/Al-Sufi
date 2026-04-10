import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, Eye, Clock, MousePointerClick } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useMemo } from "react";

const CHART_COLORS = [
  "hsl(15, 85%, 45%)",
  "hsl(40, 60%, 50%)",
  "hsl(145, 40%, 42%)",
  "hsl(200, 60%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(0, 84%, 60%)",
];

const AdminDashboard = () => {
  const { data: products } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status, total, created_at").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: totalUsers } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return data || [];
    },
  });

  const { data: productsList } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, category_id");
      return data || [];
    },
  });

  // Analytics data
  const { data: analyticsEvents = [] } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const totalRevenue = orders?.filter(o => o.status === "delivered").reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const pendingOrders = orders?.filter(o => ["placed", "confirmed"].includes(o.status)).length || 0;

  // Unique visitors (unique sessions in last 7 days)
  const uniqueVisitors = useMemo(() => {
    const sessions = new Set(analyticsEvents.map(e => e.session_id));
    return sessions.size;
  }, [analyticsEvents]);

  // Average time spent per session
  const avgTimeSpent = useMemo(() => {
    const pageViews = analyticsEvents.filter(e => e.event_type === "page_view" && e.duration_seconds);
    if (!pageViews.length) return "0m";
    const sessionTimes: Record<string, number> = {};
    pageViews.forEach(e => {
      sessionTimes[e.session_id] = (sessionTimes[e.session_id] || 0) + (e.duration_seconds || 0);
    });
    const sessions = Object.values(sessionTimes);
    const avg = sessions.reduce((a, b) => a + b, 0) / sessions.length;
    const mins = Math.floor(avg / 60);
    const secs = Math.round(avg % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, [analyticsEvents]);

  // Top clicked products
  const topClickedProducts = useMemo(() => {
    const clicks = analyticsEvents.filter(e => e.event_type === "product_click");
    const counts: Record<string, { name: string; count: number }> = {};
    clicks.forEach(e => {
      const key = e.product_id || "unknown";
      if (!counts[key]) counts[key] = { name: e.product_name || "Unknown", count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [analyticsEvents]);

  // Cart add/remove stats
  const cartStats = useMemo(() => {
    const adds = analyticsEvents.filter(e => e.event_type === "add_to_cart").length;
    const removes = analyticsEvents.filter(e => e.event_type === "remove_from_cart").length;
    return { adds, removes };
  }, [analyticsEvents]);

  // Daily visitors
  const dailyVisitors = useMemo(() => {
    const days: Record<string, Set<string>> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })] = new Set();
    }
    analyticsEvents.forEach(e => {
      const key = new Date(e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (days[key]) days[key].add(e.session_id);
    });
    return Object.entries(days).map(([date, sessions]) => ({ date, visitors: sessions.size }));
  }, [analyticsEvents]);

  // Orders per day (last 7 days)
  const dailyOrders = useMemo(() => {
    if (!orders?.length) return [];
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })] = 0;
    }
    orders.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (days[key] !== undefined) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, orders: count }));
  }, [orders]);

  // Revenue per day
  const dailyRevenue = useMemo(() => {
    if (!orders?.length) return [];
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })] = 0;
    }
    orders.filter(o => o.status === "delivered").forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      if (days[key] !== undefined) days[key] += Number(o.total);
    });
    return Object.entries(days).map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  // Order status breakdown
  const statusBreakdown = useMemo(() => {
    if (!orders?.length) return [];
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!categories?.length || !productsList?.length) return [];
    return categories.map(c => ({
      name: c.name,
      count: productsList.filter(p => p.category_id === c.id).length,
    }));
  }, [categories, productsList]);

  const stats = [
    { label: "Total Users", value: totalUsers || 0, icon: Users, color: "text-primary" },
    { label: "Visitors (7d)", value: uniqueVisitors, icon: Eye, color: "text-accent" },
    { label: "Avg Time Spent", value: avgTimeSpent, icon: Clock, color: "text-gold" },
    { label: "Total Orders", value: orders?.length || 0, icon: ShoppingCart, color: "text-primary" },
    { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-gold" },
    { label: "Pending Orders", value: pendingOrders, icon: Package, color: "text-destructive" },
    { label: "Cart Adds (7d)", value: cartStats.adds, icon: ShoppingCart, color: "text-accent" },
    { label: "Cart Removes (7d)", value: cartStats.removes, icon: MousePointerClick, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-body">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Visitors & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" /> Visitors (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyVisitors}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="visitors" stroke="hsl(200, 60%, 50%)" fill="hsl(200, 60%, 50%)" fillOpacity={0.15} strokeWidth={2.5} dot={{ fill: "hsl(200, 60%, 50%)", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Orders (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="orders" stroke="hsl(15, 85%, 45%)" strokeWidth={2.5} dot={{ fill: "hsl(15, 85%, 45%)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Revenue & Top Clicked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gold" /> Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`₹${v}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(40, 60%, 50%)" fill="hsl(40, 60%, 50%)" fillOpacity={0.15} strokeWidth={2.5} dot={{ fill: "hsl(40, 60%, 50%)", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-primary" /> Most Clicked Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClickedProducts.length > 0 ? (
              <div className="space-y-3">
                {topClickedProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-body truncate max-w-[200px]">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary/20" style={{ width: `${Math.min(p.count * 8, 120)}px` }}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((p.count / (topClickedProducts[0]?.count || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground w-8 text-right">{p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground font-body text-center py-10">No click data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Status & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground font-body text-center py-10">No orders yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Products by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(145, 40%, 42%)" fill="hsl(145, 40%, 42%)" fillOpacity={0.2} strokeWidth={2.5} dot={{ fill: "hsl(145, 40%, 42%)", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
