# Estúdio de Nail Designer - Agendamento Online

Este projeto visa criar um sistema de agendamento online para um estúdio de Nail Designer, utilizando tecnologias modernas para um deploy eficiente e uma gestão de dados robusta.

## Tecnologias Utilizadas

- **Frontend:** HTML, CSS, JavaScript (baseado nos arquivos `index.html` e `login.html` fornecidos)
- **Backend:** Python com Flask (baseado no arquivo `exe.py` fornecido)
- **Base de Dados:** Supabase (PostgreSQL)
- **Controle de Versão:** GitHub
- **Deploy:** Render

## Funcionalidades Principais

- **Agendamento de Serviços:** Clientes poderão agendar serviços de Nail Designer.
- **Autenticação de Usuários:** Sistema de login e cadastro para clientes.
- **Dashboard Administrativo:** Visão geral de agendamentos e estatísticas (a ser adaptado).
- **Gestão de Clientes:** Cadastro e gerenciamento de informações de clientes.

## Estrutura do Projeto (Proposta)

```
.github/
  workflows/
    main.yml  # GitHub Actions para CI/CD
public/
  index.html
  login.html
  style.css   # CSS extraído e organizado
  script.js   # JavaScript extraído e organizado
  assets/
    logo.png
    capa.png
src/
  app.py      # Backend Flask (adaptado de exe.py)
  templates/
    index.html
    login.html
  static/
    css/
    js/
    img/
.env          # Variáveis de ambiente
requirements.txt # Dependências Python
```

## Próximos Passos

1.  **Configuração do Repositório GitHub:** Criar o repositório e organizar a estrutura de pastas.
2.  **Adaptação do Frontend:** Modificar `index.html` e `login.html` para o tema de Nail Designer, utilizando `logo.png` e `capa.png`.
3.  **Adaptação do Backend:** Refatorar `exe.py` para `app.py`, ajustando as rotas e a lógica de negócio para agendamento.
4.  **Configuração do Supabase:** Criar o projeto no Supabase e definir o esquema da base de dados para agendamentos e clientes.
5.  **Integração Supabase:** Conectar o backend Flask ao Supabase para gerenciar agendamentos e autenticação.
6.  **Deploy no Render:** Configurar o deploy contínuo no Render.
7.  **Testes e Ajustes:** Realizar testes completos e fazer os ajustes necessários.
