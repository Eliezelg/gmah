# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Connexion à GMAH
      - generic [ref=e6]: Entrez vos identifiants pour accéder à votre compte
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: Mot de passe
        - generic [ref=e14]:
          - textbox "••••••••" [ref=e15]
          - button [active] [ref=e16]:
            - img
      - link "Mot de passe oublié?" [ref=e18] [cursor=pointer]:
        - /url: /forgot-password
      - button "Se connecter" [ref=e19]
    - paragraph [ref=e21]:
      - text: Pas encore de compte?
      - link "S'inscrire" [ref=e22] [cursor=pointer]:
        - /url: /register
  - region "Notifications alt+T"
  - generic [ref=e23]:
    - img [ref=e25]
    - button "Open Tanstack query devtools" [ref=e74] [cursor=pointer]:
      - img [ref=e75] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e129] [cursor=pointer]:
    - img [ref=e130] [cursor=pointer]
  - alert [ref=e134]
```