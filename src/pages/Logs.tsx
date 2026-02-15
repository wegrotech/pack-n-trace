import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";

type LogEntry = {
  id: string;
  action: string;
  qty: number;
  created_at: string;
  note: string | null;
  product_name: string;
  product_code: string;
};

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("stock_transactions")
      .select(`
        id, action, qty, created_at, note,
        products!inner(name, product_code)
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message);
    } else {
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        action: row.action,
        qty: row.qty,
        created_at: row.created_at,
        note: row.note,
        product_name: row.products?.name || "",
        product_code: row.products?.product_code || "",
      }));
      setLogs(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (search && !log.product_name.toLowerCase().includes(search.toLowerCase()) && !log.product_code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Stock Transaction Logs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="IN">Stock In</SelectItem>
              <SelectItem value="OUT">Stock Out</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.product_name}</div>
                      <div className="product-code">{log.product_code}</div>
                    </TableCell>
                    <TableCell>
                      <span className={log.action === "IN" ? "badge-stock-in" : "badge-stock-out"}>
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {log.action === "IN" ? "+" : "-"}{log.qty}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Logs;
