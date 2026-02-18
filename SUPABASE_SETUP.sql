-- 1. Tabela de Perfis (Extensão do Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'master')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Produtos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para Produtos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos os usuários autenticados podem ver produtos" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Apenas Master pode inserir produtos" ON products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master'));
CREATE POLICY "Apenas Master pode atualizar produtos" ON products FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master'));
CREATE POLICY "Apenas Master pode deletar produtos" ON products FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master'));

-- 3. Tabela de Atividades
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_resume_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  is_paused BOOLEAN DEFAULT FALSE,
  total_minutes INTEGER DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'Pendente',
  reworks TEXT,
  graphic_release TEXT,
  final_delivery TEXT,
  complexity TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar Log de Auditoria/Atualização Automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Rowan Level Security (Segurança)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Usuários podem ver seu próprio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para ACTIVITIES
-- Usuários comuns veem apenas as suas
CREATE POLICY "Usuários veem suas próprias atividades" ON activities FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
);

CREATE POLICY "Usuários inserem suas atividades" ON activities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam suas atividades" ON activities FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam suas próprias atividades" ON activities FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente ao cadastrar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
