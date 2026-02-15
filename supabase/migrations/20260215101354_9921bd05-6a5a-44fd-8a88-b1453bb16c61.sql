
-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.stock_transactions;

-- Make products fully public
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete products" ON public.products FOR DELETE USING (true);

-- Make transactions fully public
CREATE POLICY "Anyone can view transactions" ON public.stock_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transactions" ON public.stock_transactions FOR INSERT WITH CHECK (true);

-- Make performed_by nullable
ALTER TABLE public.stock_transactions ALTER COLUMN performed_by DROP NOT NULL;

-- Update the stock transaction function to not require user
CREATE OR REPLACE FUNCTION public.perform_stock_transaction(
    p_product_id UUID,
    p_action stock_action,
    p_qty INT,
    p_user_id UUID DEFAULT NULL,
    p_note VARCHAR DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product public.products;
BEGIN
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    IF p_action = 'OUT' AND v_product.quantity_current < p_qty THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_product.quantity_current, p_qty;
    END IF;
    
    UPDATE public.products
    SET quantity_current = CASE
        WHEN p_action = 'IN' THEN quantity_current + p_qty
        WHEN p_action = 'OUT' THEN quantity_current - p_qty
    END
    WHERE id = p_product_id
    RETURNING * INTO v_product;
    
    INSERT INTO public.stock_transactions (product_id, action, qty, performed_by, note)
    VALUES (p_product_id, p_action, p_qty, p_user_id, p_note);
    
    RETURN v_product;
END;
$$;
