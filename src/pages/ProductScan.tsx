import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

type Product = {
  id: string;
  product_code: string;
  name: string;
  price: number;
  quantity_current: number;
};

type Transaction = {
  id: string;
  action: string;
  qty: number;
  created_at: string;
  note: string | null;
};

const ProductScan = () => {
  const { code } = useParams<{ code: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_code", code)
      .single();
    if (error || !data) {
      setProduct(null);
    } else {
      setProduct(data);
      const { data: txns } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("product_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setTransactions(txns || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProduct();
  }, [code]);

  const handleStockAction = async (action: "IN" | "OUT") => {
    if (!product) return;
    if (qty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setActionLoading(true);
    try {
      const resp = await fetch('/api/perform-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_product_id: product.id, p_action: action, p_qty: qty, p_user_id: null, p_note: null }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data?.error?.message || JSON.stringify(data));
      } else {
        toast.success('Stock Updated Successfully');
        fetchProduct();
      }
    } catch (err: any) {
      toast.error(err?.message || String(err));
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse font-mono text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6">
            <p className="text-lg font-semibold text-destructive">Product not found</p>
            <p className="mt-2 text-sm text-muted-foreground">Code: {code}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md animate-fade-in space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <p className="product-code">{product.product_code}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Quantity</p>
              <p className={`mt-1 text-4xl font-bold font-mono ${product.quantity_current <= 0 ? "text-destructive" : "text-foreground"}`}>
                {product.quantity_current}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                className="text-center text-lg font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleStockAction("IN")}
                disabled={actionLoading}
                className="h-14 gap-2 bg-stock-in text-white hover:bg-stock-in/90"
              >
                <ArrowDown className="h-5 w-5" />
                STOCK IN
              </Button>
              <Button
                onClick={() => handleStockAction("OUT")}
                disabled={actionLoading}
                variant="destructive"
                className="h-14 gap-2"
              >
                <ArrowUp className="h-5 w-5" />
                STOCK OUT
              </Button>
            </div>
          </CardContent>
        </Card>

        {transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={tx.action === "IN" ? "badge-stock-in" : "badge-stock-out"}>
                      {tx.action}
                    </span>
                    <span className="font-mono text-sm font-semibold">
                      {tx.action === "IN" ? "+" : "-"}{tx.qty}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), "dd MMM yyyy HH:mm")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductScan;
