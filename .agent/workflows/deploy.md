---
description: Deploy automatizado para Cloudflare Pages
---

# Deploy Automático para Cloudflare Pages

Este workflow faz commit e push das alterações para o GitHub, trigando deploy automático no Cloudflare Pages.

## Passos

// turbo-all

1. Adicionar todas as alterações ao staging:

```bash
git add .
```

2. Fazer commit com mensagem descritiva:

```bash
git commit -m "Deploy: [DESCRIÇÃO DA ALTERAÇÃO]"
```

3. Fazer push para o GitHub:

```bash
git push origin main
```

4. Verificar status do deploy no Cloudflare:
   - Acesse <https://dash.cloudflare.com> → Pages → `crypto-analyzer-futures`
   - Aguarde ~2 minutos para o deploy completar
   - Verifique se o novo commit aparece no "Source"

## Notas

- O Cloudflare Pages detecta automaticamente pushes para `main` e faz deploy
- Se não pegar o commit, clique em "Create deployment" ou "Retry deployment"
- Variáveis de ambiente em Settings → Environment Variables
- Build command provavelmente: `npm run build`
- Build output directory: `dist`
