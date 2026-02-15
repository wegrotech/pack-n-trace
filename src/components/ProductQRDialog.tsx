import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { name: string; product_code: string } | null;
};

export const ProductQRDialog = ({ open, onOpenChange, product }: Props) => {
  if (!product) return null;

  const url = `${window.location.origin}/p/${product.product_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg bg-card p-4 shadow-sm border">
            <QRCodeSVG value={url} size={200} level="H" />
          </div>
          <p className="product-code text-center break-all">{url}</p>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
