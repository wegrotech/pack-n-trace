
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'WH_MANAGER');

-- Create stock action enum
CREATE TYPE public.stock_action AS ENUM ('IN', 'OUT');

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'WH_MANAGER',
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    quantity_current INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Stock transactions table
CREATE TABLE public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    action stock_action NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transactions" ON public.stock_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON public.stock_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);

-- Indexes
CREATE INDEX idx_product_code ON public.products(product_code);
CREATE INDEX idx_transaction_product ON public.stock_transactions(product_id);
CREATE INDEX idx_transaction_time ON public.stock_transactions(created_at);
CREATE INDEX idx_transaction_action ON public.stock_transactions(action);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for stock update (atomic transaction)
CREATE OR REPLACE FUNCTION public.perform_stock_transaction(
    p_product_id UUID,
    p_action stock_action,
    p_qty INT,
    p_user_id UUID,
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
    -- Lock and get current product
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    IF p_action = 'OUT' AND v_product.quantity_current < p_qty THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_product.quantity_current, p_qty;
    END IF;
    
    -- Update quantity
    UPDATE public.products
    SET quantity_current = CASE
        WHEN p_action = 'IN' THEN quantity_current + p_qty
        WHEN p_action = 'OUT' THEN quantity_current - p_qty
    END
    WHERE id = p_product_id
    RETURNING * INTO v_product;
    
    -- Log transaction
    INSERT INTO public.stock_transactions (product_id, action, qty, performed_by, note)
    VALUES (p_product_id, p_action, p_qty, p_user_id, p_note);
    
    RETURN v_product;
END;
$$;

-- Enable realtime for products
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
