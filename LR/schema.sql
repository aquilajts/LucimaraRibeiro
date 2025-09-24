-- Tabela para armazenar informações dos clientes
CREATE TABLE public.clientes (
    id_cliente TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    nome_lower TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    aniversario DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar os serviços oferecidos
CREATE TABLE public.servicos (
    id SERIAL PRIMARY KEY,
    nome_servico TEXT NOT NULL UNIQUE,
    descricao TEXT,
    duracao_minutos INTEGER NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar os agendamentos
CREATE TABLE public.agendamentos (
    id SERIAL PRIMARY KEY,
    id_cliente TEXT REFERENCES public.clientes(id_cliente) ON DELETE CASCADE,
    id_servico INTEGER REFERENCES public.servicos(id) ON DELETE CASCADE,
    data_agendamento DATE NOT NULL,
    hora_agendamento TIME WITHOUT TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (data_agendamento, hora_agendamento)
);

-- Inserir alguns serviços de exemplo
INSERT INTO public.servicos (nome_servico, descricao, duracao_minutos, preco) VALUES
('Manicure Simples', 'Corte, lixamento, esmaltação básica', 60, 35.00),
('Manicure Completa', 'Corte, lixamento, cutilagem, esmaltação', 75, 45.00),
('Pedicure Simples', 'Corte, lixamento, esmaltação básica', 60, 40.00),
('Pedicure Completa', 'Corte, lixamento, cutilagem, esmaltação', 75, 50.00),
('Alongamento em Gel', 'Aplicação de alongamento em gel', 120, 120.00),
('Manutenção em Gel', 'Manutenção de alongamento em gel', 90, 80.00),
('Esmaltação em Gel', 'Aplicação de esmalte em gel', 60, 60.00);

-- Habilitar RLS para a tabela clientes (se necessário, para controle de acesso)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para clientes (exemplo: clientes só podem ver/editar seus próprios dados)
CREATE POLICY "Clientes podem ver seus próprios dados" ON public.clientes FOR SELECT USING (auth.uid() = id_cliente);
CREATE POLICY "Clientes podem atualizar seus próprios dados" ON public.clientes FOR UPDATE USING (auth.uid() = id_cliente);

-- Habilitar RLS para a tabela agendamentos
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para agendamentos
CREATE POLICY "Clientes podem ver seus próprios agendamentos" ON public.agendamentos FOR SELECT USING (auth.uid() = id_cliente);
CREATE POLICY "Clientes podem criar agendamentos" ON public.agendamentos FOR INSERT WITH CHECK (auth.uid() = id_cliente);
CREATE POLICY "Clientes podem atualizar seus próprios agendamentos" ON public.agendamentos FOR UPDATE USING (auth.uid() = id_cliente);
CREATE POLICY "Clientes podem deletar seus próprios agendamentos" ON public.agendamentos FOR DELETE USING (auth.uid() = id_cliente);

-- Habilitar RLS para a tabela servicos (serviços são públicos para todos)
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Serviços são visíveis para todos" ON public.servicos FOR SELECT USING (TRUE);
