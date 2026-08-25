# Customiza Varejo — PDV Padaria BDI

Sistema de ponto de venda (PDV) para a Padaria BDI, com plano de evoluir para um
produto vendido a outros supermercados/padarias.

## Estrutura

- [`pdv/`](pdv) — app desktop (Electron + React + TypeScript) usado no caixa.
  Offline-first: grava localmente e sincroniza com o Supabase quando há internet.
- [`backoffice/`](backoffice) — app web (Vite + React + TypeScript) para cadastro
  de produtos, dashboard e gestão de clientes/fiado, consumindo o mesmo Supabase.

## Desenvolvimento

Instalar dependências de ambos os pacotes (workspaces npm):

```bash
npm install
```

Rodar o PDV (Electron):

```bash
npm run dev --workspace=pdv
```

Rodar o backoffice:

```bash
npm run dev --workspace=backoffice
```

## Decisões de arquitetura

Veja o histórico completo de decisões (levantado numa sessão `/grill-me`) e a
ordem de construção planejada — cadastro de produtos, fluxo de venda, caixa,
fiado, estoque, integração fiscal (NFC-e via provedor terceirizado), dashboard —
no plano salvo em `structured-crunching-puddle.md` (Claude Code).

Pendências conhecidas, a resolver antes de implementar o módulo correspondente:
mesas/comandas, balança com etiqueta, modelo da impressora térmica, modelo da
maquininha de cartão, confirmação do provedor de NF-e.
