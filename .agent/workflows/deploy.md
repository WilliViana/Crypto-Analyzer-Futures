---
description: Deploy automatizado para Vercel
---

# Deploy Automático para Vercel

Este workflow faz commit e push das alterações para o GitHub, triggando deploy automático no Vercel.

## Passos

// turbo-all

1. Adicionar todas as alterações ao staging:

```bash
git add .
```

1. Fazer commit com mensagem descritiva:

```bash
git commit -m "Deploy: [DESCRIÇÃO DA ALTERAÇÃO]"
```

1. Fazer push para o GitHub:

```bash
git push origin main
```

1. Verificar status do deploy no Vercel:
   - Acesse <https://vercel.com/willi-vianas-projects/crypto-analyzer-futures>
   - Aguarde ~2 minutos para o deploy completar
   - Verifique se o novo commit aparece no "Source"

## Notas

- Se o Vercel não pegar o novo commit, vá em Deployments > ... > Redeploy (sem cache)
- Variáveis de ambiente devem ser configuradas em Settings > Environment Variables
