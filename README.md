# Solo Leveling Tracker

Aplicativo de RPG de produtividade (tema Solo Leveling) feito em React + TypeScript + Tailwind.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba esta pasta:
   ```bash
   git init
   git add .
   git commit -m "primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
2. No GitHub, vá em **Settings → Pages** e em "Source" escolha **GitHub Actions**.
3. A cada `git push`, o GitHub Actions roda o build e publica automaticamente em:
   `https://SEU_USUARIO.github.io/SEU_REPO/`

## Fazer alterações futuras

Edite `src/App.tsx` (ou outros arquivos em `src/`), faça commit e push.
O site é re-publicado automaticamente pelo workflow.

## Publicar manualmente (alternativa rápida)

```bash
npm run deploy
```
(precisa do pacote `gh-pages` e de um repositório já configurado)
