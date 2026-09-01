import type { LanguagePreference } from "@/lib/auth-api";

type SupportedTranslationLanguage = Exclude<LanguagePreference, "ro">;
type UiTranslation = Record<SupportedTranslationLanguage, string>;
type UiPatternTranslation = {
  source: RegExp;
  en: (match: RegExpMatchArray) => string;
  fr: (match: RegExpMatchArray) => string;
};

export const uiTranslations: Record<string, UiTranslation> = {
  "Acasă": {
    en: "Home",
    fr: "Accueil",
  },
  "Setări": {
    en: "Settings",
    fr: "Paramètres",
  },
  "Setări admin": {
    en: "Admin settings",
    fr: "Paramètres admin",
  },
  "Abonament": {
    en: "Subscription",
    fr: "Abonnement",
  },
  "Planuri": {
    en: "Plans",
    fr: "Forfaits",
  },
  "Facturi": {
    en: "Invoices",
    fr: "Factures",
  },
  "Proiect nou": {
    en: "New project",
    fr: "Nouveau projet",
  },
  "Proiectele tale": {
    en: "Your projects",
    fr: "Tes projets",
  },
  "PROIECTELE TALE": {
    en: "YOUR PROJECTS",
    fr: "TES PROJETS",
  },
  "Cont": {
    en: "Account",
    fr: "Compte",
  },
  "Studiu": {
    en: "Study",
    fr: "Étude",
  },
  "Aspect": {
    en: "Appearance",
    fr: "Apparence",
  },
  "Culori": {
    en: "Colors",
    fr: "Couleurs",
  },
  "Notificări": {
    en: "Notifications",
    fr: "Notifications",
  },
  "Securitate": {
    en: "Security",
    fr: "Sécurité",
  },
  "Date": {
    en: "Date",
    fr: "Date",
  },
  "Limba": {
    en: "Language",
    fr: "Langue",
  },
  "Română": {
    en: "Romanian",
    fr: "Roumain",
  },
  "Engleză": {
    en: "English",
    fr: "Anglais",
  },
  "Franceză": {
    en: "French",
    fr: "Français",
  },
  "Bună,": {
    en: "Hello,",
    fr: "Bonjour,",
  },
  "Proiecte active": {
    en: "Active projects",
    fr: "Projets actifs",
  },
  "PROIECTE ACTIVE": {
    en: "ACTIVE PROJECTS",
    fr: "PROJETS ACTIFS",
  },
  "Pachete de studiu": {
    en: "Study packs",
    fr: "Packs d'étude",
  },
  "PACHETE DE STUDIU": {
    en: "STUDY PACKS",
    fr: "PACKS D'ÉTUDE",
  },
  "FLASHCARD-URI": {
    en: "FLASHCARDS",
    fr: "FLASHCARDS",
  },
  "în spațiul tău de studiu": {
    en: "in your study space",
    fr: "dans ton espace d'étude",
  },
  "cu pachet importat": {
    en: "with imported pack",
    fr: "avec pack importé",
  },
  "în pachetele generate": {
    en: "in generated packs",
    fr: "dans les packs générés",
  },
  "Deschide proiectul": {
    en: "Open project",
    fr: "Ouvrir le projet",
  },
  "DESCHIDE PROIECTUL": {
    en: "OPEN PROJECT",
    fr: "OUVRIR LE PROJET",
  },
  "Redenumire": {
    en: "Rename",
    fr: "Renommer",
  },
  "Arhivare": {
    en: "Archive",
    fr: "Archiver",
  },
  "Ștergere": {
    en: "Delete",
    fr: "Supprimer",
  },
  "Șterge definitiv": {
    en: "Delete permanently",
    fr: "Supprimer définitivement",
  },
  "Ștergere definitivă": {
    en: "Permanent deletion",
    fr: "Suppression définitive",
  },
  "Renunță": {
    en: "Cancel",
    fr: "Annuler",
  },
  "Anulează": {
    en: "Cancel",
    fr: "Annuler",
  },
  "Salvare": {
    en: "Save",
    fr: "Enregistrer",
  },
  "Salvează": {
    en: "Save",
    fr: "Enregistrer",
  },
  "Se salvează...": {
    en: "Saving...",
    fr: "Enregistrement...",
  },
  "Închide": {
    en: "Close",
    fr: "Fermer",
  },
  "Deschide meniul": {
    en: "Open menu",
    fr: "Ouvrir le menu",
  },
  "Închide meniul": {
    en: "Close menu",
    fr: "Fermer le menu",
  },
  "Ieși din cont": {
    en: "Log out",
    fr: "Se déconnecter",
  },
  "Intră în cont": {
    en: "Log in",
    fr: "Connexion",
  },
  "Creează cont": {
    en: "Create account",
    fr: "Créer un compte",
  },
  "Creează cont gratuit": {
    en: "Create free account",
    fr: "Créer un compte gratuit",
  },
  "Am deja un cont": {
    en: "I already have an account",
    fr: "J'ai déjà un compte",
  },
  "Mergi în cont": {
    en: "Go to account",
    fr: "Aller au compte",
  },
  "Înapoi la pagina principală": {
    en: "Back to homepage",
    fr: "Retour à l'accueil",
  },
  "Înapoi la pachete": {
    en: "Back to packs",
    fr: "Retour aux packs",
  },
  "Înapoi la quiz-uri": {
    en: "Back to quizzes",
    fr: "Retour aux quiz",
  },
  "Rezumat": {
    en: "Summary",
    fr: "Résumé",
  },
  "Flashcard-uri": {
    en: "Flashcards",
    fr: "Flashcards",
  },
  "Strategii": {
    en: "Strategies",
    fr: "Stratégies",
  },
  "Quiz-uri": {
    en: "Quizzes",
    fr: "Quiz",
  },
  "Progres": {
    en: "Progress",
    fr: "Progression",
  },
  "Chat AI": {
    en: "AI Chat",
    fr: "Chat IA",
  },
  "Întreabă": {
    en: "Ask",
    fr: "Demander",
  },
  "Întreabă AI": {
    en: "Ask AI",
    fr: "Demander à l'IA",
  },
  "AI inclus în Pro": {
    en: "AI included in Pro",
    fr: "IA incluse dans Pro",
  },
  "Selectează text pentru AI": {
    en: "Select text for AI",
    fr: "Sélectionne du texte pour l'IA",
  },
  "Evidențiază": {
    en: "Highlight",
    fr: "Surligner",
  },
  "Șterge": {
    en: "Delete",
    fr: "Supprimer",
  },
  "Șterge instrument": {
    en: "Remove tool",
    fr: "Retirer l'outil",
  },
  "Notiță": {
    en: "Note",
    fr: "Note",
  },
  "Instrumente": {
    en: "Tools",
    fr: "Outils",
  },
  "INSTRUMENTE": {
    en: "TOOLS",
    fr: "OUTILS",
  },
  "Cuvinte cheie": {
    en: "Keywords",
    fr: "Mots-clés",
  },
  "Ideea centrală": {
    en: "Main idea",
    fr: "Idée centrale",
  },
  "IDEEA CENTRALĂ": {
    en: "MAIN IDEA",
    fr: "IDÉE CENTRALE",
  },
  "timp estimat": {
    en: "estimated time",
    fr: "temps estimé",
  },
  "concepte cheie": {
    en: "key concepts",
    fr: "concepts clés",
  },
  "Generate inițial": {
    en: "Initially generated",
    fr: "Généré initialement",
  },
  "GENERATE INITIAL": {
    en: "INITIALLY GENERATED",
    fr: "GÉNÉRÉ INITIALEMENT",
  },
  "Recapitulare adaptivă": {
    en: "Adaptive review",
    fr: "Révision adaptative",
  },
  "Creează flashcard": {
    en: "Create flashcard",
    fr: "Créer une flashcard",
  },
  "Creează flashcard.": {
    en: "Create flashcard.",
    fr: "Créer une flashcard.",
  },
  "Creează primul flashcard": {
    en: "Create first flashcard",
    fr: "Créer la première flashcard",
  },
  "Continuă": {
    en: "Continue",
    fr: "Continuer",
  },
  "Vezi răspunsul": {
    en: "Show answer",
    fr: "Voir la réponse",
  },
  "Vezi întrebarea": {
    en: "Show question",
    fr: "Voir la question",
  },
  "Amestecă": {
    en: "Shuffle",
    fr: "Mélanger",
  },
  "Doar marcate pentru recapitulare": {
    en: "Only marked for review",
    fr: "Seulement marquées pour révision",
  },
  "Întrebare": {
    en: "Question",
    fr: "Question",
  },
  "Răspuns": {
    en: "Answer",
    fr: "Réponse",
  },
  "Față": {
    en: "Front",
    fr: "Recto",
  },
  "Spate": {
    en: "Back",
    fr: "Verso",
  },
  "Adaugă imagine": {
    en: "Add image",
    fr: "Ajouter une image",
  },
  "Scrie întrebarea aici...": {
    en: "Write the question here...",
    fr: "Écris la question ici...",
  },
  "Scrie răspunsul...": {
    en: "Write the answer...",
    fr: "Écris la réponse...",
  },
  "Categorie": {
    en: "Category",
    fr: "Catégorie",
  },
  "Dificultate": {
    en: "Difficulty",
    fr: "Difficulté",
  },
  "Ușor": {
    en: "Easy",
    fr: "Facile",
  },
  "Mediu": {
    en: "Medium",
    fr: "Moyen",
  },
  "Greu": {
    en: "Hard",
    fr: "Difficile",
  },
  "Mică": {
    en: "Low",
    fr: "Faible",
  },
  "Medie": {
    en: "Medium",
    fr: "Moyenne",
  },
  "Ridicată": {
    en: "High",
    fr: "Élevée",
  },
  "Mixt": {
    en: "Mixed",
    fr: "Mixte",
  },
  "Începe": {
    en: "Start",
    fr: "Commencer",
  },
  "Reintră": {
    en: "Re-enter",
    fr: "Reprendre",
  },
  "Verifică răspunsul": {
    en: "Check answer",
    fr: "Vérifier la réponse",
  },
  "Următoarea întrebare": {
    en: "Next question",
    fr: "Question suivante",
  },
  "Înapoi": {
    en: "Back",
    fr: "Retour",
  },
  "Hartă quiz": {
    en: "Quiz map",
    fr: "Carte du quiz",
  },
  "Acuratețe": {
    en: "Accuracy",
    fr: "Précision",
  },
  "Întrebări": {
    en: "Questions",
    fr: "Questions",
  },
  "Durată": {
    en: "Duration",
    fr: "Durée",
  },
  "Generează quizuri": {
    en: "Generate quizzes",
    fr: "Générer les quiz",
  },
  "Se generează...": {
    en: "Generating...",
    fr: "Génération...",
  },
  "Generează testele când vrei.": {
    en: "Generate tests when you want.",
    fr: "Génère les tests quand tu veux.",
  },
  "Zone care necesită atenție": {
    en: "Areas needing attention",
    fr: "Zones à travailler",
  },
  "Evoluția scorurilor": {
    en: "Score evolution",
    fr: "Évolution des scores",
  },
  "Ultimele încercări": {
    en: "Recent attempts",
    fr: "Derniers essais",
  },
  "Ultima încercare": {
    en: "Last attempt",
    fr: "Dernier essai",
  },
  "Neîncercat": {
    en: "Not attempted",
    fr: "Non essayé",
  },
  "Greșeli salvate": {
    en: "Saved mistakes",
    fr: "Erreurs enregistrées",
  },
  "Atenție azi": {
    en: "Focus today",
    fr: "Attention aujourd'hui",
  },
  "Următorul pas": {
    en: "Next step",
    fr: "Étape suivante",
  },
  "Flashcard-uri din greșeli": {
    en: "Mistake flashcards",
    fr: "Flashcards d'erreurs",
  },
  "Highlight-uri în rezumat": {
    en: "Summary highlights",
    fr: "Surlignages du résumé",
  },
  "Încercări la quiz-uri": {
    en: "Quiz attempts",
    fr: "Essais aux quiz",
  },
  "Încarcă un curs.": {
    en: "Upload a course.",
    fr: "Importer un cours.",
  },
  "Nume proiect": {
    en: "Project name",
    fr: "Nom du projet",
  },
  "Nume": {
    en: "Name",
    fr: "Nom",
  },
  "Materie": {
    en: "Subject",
    fr: "Matière",
  },
  "Școală": {
    en: "School",
    fr: "École",
  },
  "Cum îl vei găsi în cont.": {
    en: "How you will find it in your account.",
    fr: "Comment tu le retrouveras dans ton compte.",
  },
  "Context pentru AI.": {
    en: "Context for AI.",
    fr: "Contexte pour l'IA.",
  },
  "Facultate, școală sau nivel.": {
    en: "Faculty, school or level.",
    fr: "Faculté, école ou niveau.",
  },
  "Adaugă materialele": {
    en: "Add materials",
    fr: "Ajouter les supports",
  },
  "Alege fișiere": {
    en: "Choose files",
    fr: "Choisir des fichiers",
  },
  "Elimină": {
    en: "Remove",
    fr: "Retirer",
  },
  "Pregătire": {
    en: "Preparation",
    fr: "Préparation",
  },
  "Progres pregătire": {
    en: "Preparation progress",
    fr: "Progression de la préparation",
  },
  "Am dreptul să folosesc aceste materiale.": {
    en: "I have the right to use these materials.",
    fr: "J'ai le droit d'utiliser ces supports.",
  },
  "Generează pachetul": {
    en: "Generate pack",
    fr: "Générer le pack",
  },
  "Pachetul este pregătit": {
    en: "The pack is prepared",
    fr: "Le pack est préparé",
  },
  "Generăm pachetul": {
    en: "Generating pack",
    fr: "Génération du pack",
  },
  "Încărcare materiale": {
    en: "Uploading materials",
    fr: "Import des supports",
  },
  "Pregătire materiale": {
    en: "Preparing materials",
    fr: "Préparation des supports",
  },
  "Generare AI": {
    en: "AI generation",
    fr: "Génération IA",
  },
  "Salvare pachet": {
    en: "Saving pack",
    fr: "Enregistrement du pack",
  },
  "Alege planul potrivit.": {
    en: "Choose the right plan.",
    fr: "Choisis le bon forfait.",
  },
  "Planuri simple, transparente, cu reînnoire lunară.": {
    en: "Simple, transparent plans with monthly renewal.",
    fr: "Forfaits simples et transparents avec renouvellement mensuel.",
  },
  "Beginner activ": {
    en: "Beginner active",
    fr: "Beginner actif",
  },
  "Plan activ": {
    en: "Active plan",
    fr: "Forfait actif",
  },
  "PLAN ACTIV": {
    en: "ACTIVE PLAN",
    fr: "FORFAIT ACTIF",
  },
  "Recomandat": {
    en: "Recommended",
    fr: "Recommandé",
  },
  "RECOMANDAT": {
    en: "RECOMMENDED",
    fr: "RECOMMANDÉ",
  },
  "Plan curent": {
    en: "Current plan",
    fr: "Forfait actuel",
  },
  "Schimbă planul": {
    en: "Change plan",
    fr: "Changer de forfait",
  },
  "Plătește și activează abonamentul": {
    en: "Pay and activate subscription",
    fr: "Payer et activer l'abonnement",
  },
  "Anulează reînnoirea": {
    en: "Cancel renewal",
    fr: "Annuler le renouvellement",
  },
  "Reactivează reînnoirea": {
    en: "Reactivate renewal",
    fr: "Réactiver le renouvellement",
  },
  "Reîncarcă": {
    en: "Reload",
    fr: "Recharger",
  },
  "Plăți recente": {
    en: "Recent payments",
    fr: "Paiements récents",
  },
  "Vezi factura": {
    en: "View invoice",
    fr: "Voir la facture",
  },
  "Plătită": {
    en: "Paid",
    fr: "Payée",
  },
  "Verifică planul înainte de plată.": {
    en: "Review your plan before payment.",
    fr: "Vérifie ton forfait avant le paiement.",
  },
  "Sumar Plată": {
    en: "Payment summary",
    fr: "Résumé du paiement",
  },
  "Plan selectat": {
    en: "Selected plan",
    fr: "Forfait sélectionné",
  },
  "Monedă plată": {
    en: "Payment currency",
    fr: "Devise de paiement",
  },
  "TVA inclus": {
    en: "VAT included",
    fr: "TVA incluse",
  },
  "Frecvență plată": {
    en: "Payment frequency",
    fr: "Fréquence de paiement",
  },
  "Preț Total": {
    en: "Total price",
    fr: "Prix total",
  },
  "Ce urmează?": {
    en: "What happens next?",
    fr: "Et ensuite ?",
  },
  "Continuă către plată securizată →": {
    en: "Continue to secure payment →",
    fr: "Continuer vers le paiement sécurisé →",
  },
  "Se pregătește checkout-ul...": {
    en: "Preparing checkout...",
    fr: "Préparation du paiement...",
  },
  "Datele contului tău.": {
    en: "Your account details.",
    fr: "Les données de ton compte.",
  },
  "PROFIL": {
    en: "PROFILE",
    fr: "PROFIL",
  },
  "Interfață": {
    en: "Interface",
    fr: "Interface",
  },
  "Alege modul de afișare.": {
    en: "Choose display mode.",
    fr: "Choisis le mode d'affichage.",
  },
  "Light": {
    en: "Light",
    fr: "Clair",
  },
  "Luminos": {
    en: "Light",
    fr: "Clair",
  },
  "Dark": {
    en: "Dark",
    fr: "Sombre",
  },
  "System": {
    en: "System",
    fr: "Système",
  },
  "activ": {
    en: "active",
    fr: "actif",
  },
  "alege": {
    en: "choose",
    fr: "choisir",
  },
  "Preview paletă": {
    en: "Palette preview",
    fr: "Aperçu de la palette",
  },
  "PREVIEW PALETĂ": {
    en: "PALETTE PREVIEW",
    fr: "APERÇU PALETTE",
  },
  "Modifică": {
    en: "Edit",
    fr: "Modifier",
  },
  "Resetează modificările": {
    en: "Reset changes",
    fr: "Réinitialiser",
  },
  "Schimbă parola": {
    en: "Change password",
    fr: "Changer le mot de passe",
  },
  "Setări cookie": {
    en: "Cookie settings",
    fr: "Paramètres des cookies",
  },
  "Descarcă datele": {
    en: "Download data",
    fr: "Télécharger les données",
  },
  "Arhivă": {
    en: "Archive",
    fr: "Archive",
  },
  "Restabilește": {
    en: "Restore",
    fr: "Restaurer",
  },
  "Utilizatori": {
    en: "Users",
    fr: "Utilisateurs",
  },
  "Loguri": {
    en: "Logs",
    fr: "Journaux",
  },
  "Termeni și condiții": {
    en: "Terms and conditions",
    fr: "Conditions générales",
  },
  "Politica de confidențialitate": {
    en: "Privacy policy",
    fr: "Politique de confidentialité",
  },
  "Datele firmei": {
    en: "Company details",
    fr: "Informations de l'entreprise",
  },
  "Date firmă": {
    en: "Company details",
    fr: "Informations entreprise",
  },
  "Salvează datele": {
    en: "Save details",
    fr: "Enregistrer",
  },
  "Salvează secțiunea": {
    en: "Save section",
    fr: "Enregistrer la section",
  },
  "Setări globale aplicație": {
    en: "Global app settings",
    fr: "Paramètres globaux",
  },
  "Plan și administrare plan": {
    en: "Plans and plan management",
    fr: "Forfaits et gestion",
  },
  "Toți utilizatorii": {
    en: "All users",
    fr: "Tous les utilisateurs",
  },
  "Jurnal activitate": {
    en: "Activity log",
    fr: "Journal d'activité",
  },
  "Contact și suport": {
    en: "Contact and support",
    fr: "Contact et support",
  },
  "Raportează conținut": {
    en: "Report content",
    fr: "Signaler du contenu",
  },
  "Preferințe": {
    en: "Preferences",
    fr: "Préférences",
  },
  "Nume complet": {
    en: "Full name",
    fr: "Nom complet",
  },
  "Adresă de email": {
    en: "Email address",
    fr: "Adresse e-mail",
  },
  "Parolă": {
    en: "Password",
    fr: "Mot de passe",
  },
  "Confirmă parola": {
    en: "Confirm password",
    fr: "Confirmer le mot de passe",
  },
  "Parolă nouă": {
    en: "New password",
    fr: "Nouveau mot de passe",
  },
  "Confirmă parola nouă": {
    en: "Confirm new password",
    fr: "Confirmer le nouveau mot de passe",
  },
  "Ai uitat parola?": {
    en: "Forgot password?",
    fr: "Mot de passe oublié ?",
  },
  "Parola ta": {
    en: "Your password",
    fr: "Ton mot de passe",
  },
  "Minimum 10 caractere": {
    en: "Minimum 10 characters",
    fr: "Minimum 10 caractères",
  },
  "Repetă parola": {
    en: "Repeat password",
    fr: "Répète le mot de passe",
  },
  "Păstrează-mă conectat pe acest dispozitiv.": {
    en: "Keep me signed in on this device.",
    fr: "Rester connecté sur cet appareil.",
  },
  "Parolele introduse nu coincid.": {
    en: "The passwords do not match.",
    fr: "Les mots de passe ne correspondent pas.",
  },
  "Serviciul de autentificare nu este disponibil momentan.": {
    en: "The authentication service is temporarily unavailable.",
    fr: "Le service d'authentification est momentanément indisponible.",
  },
  "Resetare parolă": {
    en: "Password reset",
    fr: "Réinitialisation du mot de passe",
  },
  "Linkul de resetare a fost deja solicitat.": {
    en: "The reset link has already been requested.",
    fr: "Le lien de réinitialisation a déjà été demandé.",
  },
  "Verifică emailul pentru linkul de resetare.": {
    en: "Check your email for the reset link.",
    fr: "Vérifie ton e-mail pour le lien de réinitialisation.",
  },
  "Verifică emailul": {
    en: "Check your email",
    fr: "Vérifie ton e-mail",
  },
  "Linkul de confirmare a fost trimis.": {
    en: "The confirmation link has been sent.",
    fr: "Le lien de confirmation a été envoyé.",
  },
  "Am înțeles": {
    en: "Got it",
    fr: "Compris",
  },
  "Se procesează...": {
    en: "Processing...",
    fr: "Traitement...",
  },
  "Linkul a fost trimis": {
    en: "The link has been sent",
    fr: "Le lien a été envoyé",
  },
  "Trimite linkul de resetare": {
    en: "Send reset link",
    fr: "Envoyer le lien",
  },
  "Creează contul": {
    en: "Create account",
    fr: "Créer le compte",
  },
  "Ascunde parola": {
    en: "Hide password",
    fr: "Masquer le mot de passe",
  },
  "Afișează parola": {
    en: "Show password",
    fr: "Afficher le mot de passe",
  },
  "Alege o parolă nouă și revino în cont.": {
    en: "Choose a new password and return to your account.",
    fr: "Choisis un nouveau mot de passe et reviens dans ton compte.",
  },
  "Setează parola nouă": {
    en: "Set new password",
    fr: "Définir le nouveau mot de passe",
  },
  "Ți-ai amintit parola?": {
    en: "Remembered your password?",
    fr: "Tu te souviens du mot de passe ?",
  },
  "Înapoi la autentificare": {
    en: "Back to login",
    fr: "Retour à la connexion",
  },
  "Email confirmat. Contul tău a fost creat.": {
    en: "Email confirmed. Your account has been created.",
    fr: "E-mail confirmé. Ton compte a été créé.",
  },
  "Verificăm adresa de email...": {
    en: "Verifying email address...",
    fr: "Vérification de l'adresse e-mail...",
  },
  "Creează cont din nou": {
    en: "Create account again",
    fr: "Créer un compte à nouveau",
  },
  "Spațiul tău de studiu": {
    en: "Your study space",
    fr: "Ton espace d'étude",
  },
  "Bine ai revenit": {
    en: "Welcome back",
    fr: "Bon retour",
  },
  "Înregistrează-te": {
    en: "Sign up",
    fr: "Inscription",
  },
  "Fundal aplicație": {
    en: "App background",
    fr: "Fond de l'application",
  },
  "Suprafață": {
    en: "Surface",
    fr: "Surface",
  },
  "Border": {
    en: "Border",
    fr: "Bordure",
  },
  "Text principal": {
    en: "Primary text",
    fr: "Texte principal",
  },
  "Text secundar": {
    en: "Secondary text",
    fr: "Texte secondaire",
  },
  "Acțiune": {
    en: "Action",
    fr: "Action",
  },
  "Atenționare": {
    en: "Warning",
    fr: "Avertissement",
  },
  "Succes": {
    en: "Success",
    fr: "Succès",
  },
  "Informație": {
    en: "Information",
    fr: "Information",
  },
  "Curs activ": {
    en: "Active course",
    fr: "Cours actif",
  },
  "CURS ACTIV": {
    en: "ACTIVE COURSE",
    fr: "COURS ACTIF",
  },
  "Status": {
    en: "Status",
    fr: "Statut",
  },
  "Atenție": {
    en: "Attention",
    fr: "Attention",
  },
  "Politica privind cookie-urile": {
    en: "Cookie policy",
    fr: "Politique relative aux cookies",
  },
  "Retragere din contract": {
    en: "Contract withdrawal",
    fr: "Rétractation du contrat",
  },
  "Anulare abonament": {
    en: "Cancel subscription",
    fr: "Annuler l'abonnement",
  },
  "Contact": {
    en: "Contact",
    fr: "Contact",
  },
  "Suport": {
    en: "Support",
    fr: "Support",
  },
  "Necesare": {
    en: "Necessary",
    fr: "Nécessaires",
  },
  "Funcționale": {
    en: "Functional",
    fr: "Fonctionnels",
  },
  "Analiză": {
    en: "Analytics",
    fr: "Analyse",
  },
  "Marketing": {
    en: "Marketing",
    fr: "Marketing",
  },
  "Acceptă": {
    en: "Accept",
    fr: "Accepter",
  },
  "Respinge": {
    en: "Reject",
    fr: "Refuser",
  },
  "Încarci materialul": {
    en: "Upload the material",
    fr: "Importer le support",
  },
  "Adaugi PDF-ul, notițele sau suportul de curs. Fără să rescrii manual capitole întregi.": {
    en: "Add the PDF, notes or course material. No need to rewrite entire chapters manually.",
    fr: "Ajoute le PDF, les notes ou le support de cours. Pas besoin de recopier des chapitres entiers.",
  },
  "AI-ul îl structurează": {
    en: "AI structures it",
    fr: "L'IA le structure",
  },
  "Reviss identifică ideile importante și pregătește rezumatul, flashcard-urile și testele.": {
    en: "Reviss identifies the important ideas and prepares the summary, flashcards and tests.",
    fr: "Reviss identifie les idées importantes et prépare le résumé, les flashcards et les tests.",
  },
  "Înveți activ": {
    en: "Learn actively",
    fr: "Apprendre activement",
  },
  "Exersezi, primești explicații și vezi exact ce concepte trebuie recapitulate.": {
    en: "Practise, get explanations and see exactly which concepts need review.",
    fr: "Entraîne-toi, reçois des explications et vois exactement quels concepts réviser.",
  },
  "Tot ce ai nevoie pentru facultate, de la seminar la examen.": {
    en: "Everything you need for university, from seminar to exam.",
    fr: "Tout ce qu'il te faut pour l'université, du séminaire à l'examen.",
  },
  "Pentru primul curs și primele sesiuni de studiu activ.": {
    en: "For your first course and first active study sessions.",
    fr: "Pour ton premier cours et tes premières sessions d'étude active.",
  },
  "Pentru primul curs și testarea fluxului Reviss.": {
    en: "For your first course and testing the Reviss flow.",
    fr: "Pour ton premier cours et tester le flux Reviss.",
  },
  "Pentru sesiuni intense, licență și volume mari de cursuri.": {
    en: "For intense sessions, thesis prep and large course volumes.",
    fr: "Pour les sessions intensives, le mémoire et de gros volumes de cours.",
  },
  "Rezumat, flashcard-uri și quiz": {
    en: "Summary, flashcards and quiz",
    fr: "Résumé, flashcards et quiz",
  },
  "3 materiale procesate lunar": {
    en: "3 materials processed monthly",
    fr: "3 supports traités par mois",
  },
  "Maximum 25 de pagini per material": {
    en: "Maximum 25 pages per material",
    fr: "Maximum 25 pages par support",
  },
  "Istoric pentru ultimele 7 zile": {
    en: "History for the last 7 days",
    fr: "Historique des 7 derniers jours",
  },
  "30 de materiale procesate lunar": {
    en: "30 materials processed monthly",
    fr: "30 supports traités par mois",
  },
  "Maximum 200 de pagini per material": {
    en: "Maximum 200 pages per material",
    fr: "Maximum 200 pages par support",
  },
  "Flashcard-uri și quiz-uri nelimitate": {
    en: "Unlimited flashcards and quizzes",
    fr: "Flashcards et quiz illimités",
  },
  "Repetiție inteligentă și explicații AI": {
    en: "Smart repetition and AI explanations",
    fr: "Répétition intelligente et explications IA",
  },
  "Progres complet pentru fiecare curs": {
    en: "Full progress for every course",
    fr: "Progression complète pour chaque cours",
  },
  "100 de materiale procesate lunar": {
    en: "100 materials processed monthly",
    fr: "100 supports traités par mois",
  },
  "Maximum 500 de pagini per material": {
    en: "Maximum 500 pages per material",
    fr: "Maximum 500 pages par support",
  },
  "Generare prioritară în perioade aglomerate": {
    en: "Priority generation during busy periods",
    fr: "Génération prioritaire en période chargée",
  },
  "Simulări de examen și analiză avansată": {
    en: "Exam simulations and advanced analysis",
    fr: "Simulations d'examen et analyse avancée",
  },
  "Export pentru rezumate și flashcard-uri": {
    en: "Export summaries and flashcards",
    fr: "Export des résumés et flashcards",
  },
  "Curs procesat de Reviss": {
    en: "Course processed by Reviss",
    fr: "Cours traité par Reviss",
  },
  "Curs încărcat": {
    en: "Uploaded course",
    fr: "Cours importé",
  },
  "CURS ÎNCĂRCAT": {
    en: "UPLOADED COURSE",
    fr: "COURS IMPORTÉ",
  },
  "Pachet generat": {
    en: "Generated pack",
    fr: "Pack généré",
  },
  "PACHET GENERAT": {
    en: "GENERATED PACK",
    fr: "PACK GÉNÉRÉ",
  },
  "Următoarea sesiune": {
    en: "Next session",
    fr: "Prochaine session",
  },
  "12 flashcard-uri + quiz de 8 întrebări": {
    en: "12 flashcards + 8-question quiz",
    fr: "12 flashcards + quiz de 8 questions",
  },
  "Un singur curs": {
    en: "One course",
    fr: "Un seul cours",
  },
  "rezumat, carduri și test": {
    en: "summary, cards and test",
    fr: "résumé, cartes et test",
  },
  "Învățare activă": {
    en: "Active learning",
    fr: "Apprentissage actif",
  },
  "nu citire pasivă": {
    en: "not passive reading",
    fr: "pas de lecture passive",
  },
  "Repetiție ghidată": {
    en: "Guided repetition",
    fr: "Répétition guidée",
  },
  "exact când ai nevoie": {
    en: "exactly when you need it",
    fr: "exactement quand tu en as besoin",
  },
  "Temă adaptivă": {
    en: "Adaptive theme",
    fr: "Thème adaptatif",
  },
  "confort zi și noapte": {
    en: "comfort day and night",
    fr: "confort jour et nuit",
  },
  "Din material brut în progres clar": {
    en: "From raw material to clear progress",
    fr: "Du support brut à une progression claire",
  },
  "Trei pași între curs și înțelegere.": {
    en: "Three steps between course and understanding.",
    fr: "Trois étapes entre le cours et la compréhension.",
  },
  "Fără zeci de tab-uri și fără ore pierdute pregătind materiale. Reviss construiește spațiul de studiu, iar tu te concentrezi pe învățare.": {
    en: "No dozens of tabs and no hours lost preparing materials. Reviss builds the study space, while you focus on learning.",
    fr: "Pas de dizaines d'onglets ni d'heures perdues à préparer les supports. Reviss construit l'espace d'étude, tu te concentres sur l'apprentissage.",
  },
  "O sesiune care știe ce urmează": {
    en: "A session that knows what comes next",
    fr: "Une session qui sait quoi faire ensuite",
  },
  "De la „am citit” la „știu să răspund”.": {
    en: "From “I read it” to “I can answer it”.",
    fr: "De « j'ai lu » à « je sais répondre ».",
  },
  "De la „am citit” la „pot explica”.": {
    en: "From “I read it” to “I can explain it”.",
    fr: "De « j'ai lu » à « je peux l'expliquer ».",
  },
  "Platforma combină rezumatul cu testarea activă și progresul vizibil. Fiecare sesiune are un scop clar, nu doar încă o pagină de parcurs.": {
    en: "The platform combines summaries with active testing and visible progress. Every session has a clear purpose, not just another page to go through.",
    fr: "La plateforme combine résumé, test actif et progression visible. Chaque session a un objectif clair, pas seulement une page de plus à lire.",
  },
  "Creează primul pachet": {
    en: "Create first pack",
    fr: "Créer le premier pack",
  },
  "Rezumat esențial": {
    en: "Essential summary",
    fr: "Résumé essentiel",
  },
  "Ideile importante, fără zgomot.": {
    en: "Important ideas, without noise.",
    fr: "Les idées importantes, sans bruit.",
  },
  "Întrebări explicate": {
    en: "Explained questions",
    fr: "Questions expliquées",
  },
  "Nu doar corect sau greșit, ci și de ce.": {
    en: "Not just right or wrong, but why.",
    fr: "Pas seulement juste ou faux, mais pourquoi.",
  },
  "Repetiție inteligentă": {
    en: "Smart repetition",
    fr: "Répétition intelligente",
  },
  "Revii la concepte înainte să le uiți.": {
    en: "Return to concepts before you forget them.",
    fr: "Reviens aux concepts avant de les oublier.",
  },
  "Progres vizibil": {
    en: "Visible progress",
    fr: "Progression visible",
  },
  "Știi ce stăpânești și ce mai trebuie lucrat.": {
    en: "Know what you master and what still needs work.",
    fr: "Sache ce que tu maîtrises et ce qu'il faut encore travailler.",
  },
  "Tot ce ai nevoie într-un singur loc": {
    en: "Everything you need in one place",
    fr: "Tout ce qu'il te faut au même endroit",
  },
  "Construit pentru sesiune, colocviu și examen.": {
    en: "Built for study sessions, tests and exams.",
    fr: "Conçu pour les révisions, contrôles et examens.",
  },
  "Fiecare instrument este legat de același curs, astfel încât să nu pierzi contextul când treci de la înțelegere la exersare.": {
    en: "Every tool stays linked to the same course, so you do not lose context when moving from understanding to practice.",
    fr: "Chaque outil reste lié au même cours, pour ne pas perdre le contexte entre compréhension et entraînement.",
  },
  "Înțelegi răspunsul, nu doar scorul.": {
    en: "Understand the answer, not just the score.",
    fr: "Comprends la réponse, pas seulement le score.",
  },
  "Care organit produce cea mai mare parte din ATP?": {
    en: "Which organelle produces most ATP?",
    fr: "Quel organite produit la majeure partie de l'ATP ?",
  },
  "Ribozomul": {
    en: "Ribosome",
    fr: "Ribosome",
  },
  "Mitocondria": {
    en: "Mitochondrion",
    fr: "Mitochondrie",
  },
  "Aparatul Golgi": {
    en: "Golgi apparatus",
    fr: "Appareil de Golgi",
  },
  "Mitocondria transformă energia nutrienților în ATP, forma de energie folosită de celulă.": {
    en: "The mitochondrion turns nutrient energy into ATP, the energy form used by the cell.",
    fr: "La mitochondrie transforme l'énergie des nutriments en ATP, la forme d'énergie utilisée par la cellule.",
  },
  "Progres fără presupuneri": {
    en: "Progress without guessing",
    fr: "Progression sans supposer",
  },
  "Vezi conceptele stăpânite, răspunsurile dificile și ce trebuie repetat în următoarea sesiune.": {
    en: "See mastered concepts, difficult answers and what to repeat in the next session.",
    fr: "Vois les concepts maîtrisés, les réponses difficiles et quoi répéter à la prochaine session.",
  },
  "Materialele tale rămân sursa": {
    en: "Your materials stay the source",
    fr: "Tes supports restent la source",
  },
  "Întrebările și explicațiile pornesc din cursul încărcat, ca studiul să rămână relevant pentru materia ta.": {
    en: "Questions and explanations start from the uploaded course, so study stays relevant to your subject.",
    fr: "Les questions et explications partent du cours importé, pour rester pertinentes pour ta matière.",
  },
  "Abonamente simple, fără surprize": {
    en: "Simple plans, no surprises",
    fr: "Abonnements simples, sans surprise",
  },
  "Alege cât de intens vrei să înveți.": {
    en: "Choose how intensely you want to study.",
    fr: "Choisis l'intensité de ton apprentissage.",
  },
  "Începi gratuit, iar când cursurile se adună poți trece la un plan cu mai mult spațiu, repetiție inteligentă și analiză de progres.": {
    en: "Start free, then upgrade when courses pile up for more space, smart repetition and progress analysis.",
    fr: "Commence gratuitement, puis passe à un forfait avec plus d'espace, répétition intelligente et analyse de progression.",
  },
  "Poți anula sau schimba planul oricând": {
    en: "You can cancel or change your plan anytime",
    fr: "Tu peux annuler ou changer de forfait à tout moment",
  },
  "Cea mai bună alegere": {
    en: "Best choice",
    fr: "Meilleur choix",
  },
  "Vezi detaliile planului": {
    en: "View plan details",
    fr: "Voir les détails du forfait",
  },
  "Prețurile includ TVA. Plata se face lunar, fără perioadă contractuală.": {
    en: "Prices include VAT. Payment is monthly, with no fixed contract period.",
    fr: "Les prix incluent la TVA. Paiement mensuel, sans engagement.",
  },
  "Începe cu următorul tău curs": {
    en: "Start with your next course",
    fr: "Commence avec ton prochain cours",
  },
  "Mai puțin timp pregătind. Mai mult timp învățând.": {
    en: "Less time preparing. More time learning.",
    fr: "Moins de préparation. Plus d'apprentissage.",
  },
  "Începe simplu. Învață sigur.": {
    en: "Start simple. Learn with confidence.",
    fr: "Commence simplement. Apprends avec confiance.",
  },
  "Creează-ți contul și transformă primul material într-o sesiune de studiu clară și activă.": {
    en: "Create your account and turn your first material into a clear, active study session.",
    fr: "Crée ton compte et transforme ton premier support en session d'étude claire et active.",
  },
  "Întrebări frecvente": {
    en: "Frequently asked questions",
    fr: "Questions fréquentes",
  },
  "Înainte să începi.": {
    en: "Before you start.",
    fr: "Avant de commencer.",
  },
  "Ce tipuri de materiale pot încărca?": {
    en: "What types of materials can I upload?",
    fr: "Quels types de supports puis-je importer ?",
  },
  "Platforma este gândită pentru PDF-uri, documente și notițe text. Formatele disponibile vor fi afișate clar în zona de încărcare.": {
    en: "The platform is designed for PDFs, documents and text notes. Available formats are clearly shown in the upload area.",
    fr: "La plateforme est pensée pour les PDF, documents et notes texte. Les formats disponibles sont affichés clairement dans la zone d'import.",
  },
  "Reviss îmi înlocuiește cursul?": {
    en: "Does Reviss replace my course?",
    fr: "Reviss remplace-t-il mon cours ?",
  },
  "Nu. Cursul rămâne sursa principală, iar Reviss îl structurează în instrumente de învățare activă.": {
    en: "No. The course remains the main source, and Reviss structures it into active learning tools.",
    fr: "Non. Le cours reste la source principale, Reviss le structure en outils d'apprentissage actif.",
  },
  "Pot folosi tema întunecată?": {
    en: "Can I use dark mode?",
    fr: "Puis-je utiliser le mode sombre ?",
  },
  "Da. Tema Warm Night este disponibilă pe toate paginile și preferința rămâne salvată pe dispozitiv.": {
    en: "Yes. The Warm Night theme is available on all pages and the preference stays saved on the device.",
    fr: "Oui. Le thème Warm Night est disponible sur toutes les pages et la préférence reste enregistrée sur l'appareil.",
  },
  "Funcționează și pe telefon?": {
    en: "Does it work on phone too?",
    fr: "Est-ce que ça fonctionne aussi sur téléphone ?",
  },
  "Da. Interfața, formularele și sesiunile de studiu sunt construite responsive pentru telefon, tabletă și desktop.": {
    en: "Yes. The interface, forms and study sessions are responsive for phone, tablet and desktop.",
    fr: "Oui. L'interface, les formulaires et les sessions d'étude sont responsives sur téléphone, tablette et ordinateur.",
  },
  "Ce materiale pot încărca în Reviss?": {
    en: "What materials can I upload to Reviss?",
    fr: "Quels supports puis-je importer dans Reviss ?",
  },
  "Poți încărca PDF-uri, documente Word, prezentări și notițe text. Pentru documente scanate sau poze cu text, accesul este rezervat planului Pro, unde activăm procesare OCR.": {
    en: "You can upload PDFs, Word documents, presentations and text notes. For scanned documents or images with text, access is reserved for the Pro plan, where OCR processing is enabled.",
    fr: "Tu peux importer des PDF, documents Word, présentations et notes texte. Pour les documents scannés ou images avec texte, l'accès est réservé au plan Pro, avec traitement OCR.",
  },
  "Ce generează Reviss dintr-un curs?": {
    en: "What does Reviss generate from a course?",
    fr: "Que génère Reviss à partir d'un cours ?",
  },
  "Mai întâi primești rezumatul, cuvintele-cheie, strategiile de învățare și flashcard-urile. Quiz-urile se generează separat, când ești pregătit să intri în testare activă.": {
    en: "First you receive the summary, keywords, learning strategies and flashcards. Quizzes are generated separately when you are ready to start active testing.",
    fr: "Tu reçois d'abord le résumé, les mots-clés, les stratégies d'apprentissage et les flashcards. Les quiz sont générés séparément lorsque tu es prêt pour l'entraînement actif.",
  },
  "Quiz-urile sunt utile pentru examen?": {
    en: "Are the quizzes useful for exams?",
    fr: "Les quiz sont-ils utiles pour les examens ?",
  },
  "Da, întrebările sunt gândite pe niveluri: recapitulare, înțelegere și aplicare, apoi simulare de examen. Nu înlocuiesc subiectele oficiale, dar te ajută să vezi unde trebuie să revii.": {
    en: "Yes, the questions are designed in levels: review, understanding and application, then exam simulation. They do not replace official exam topics, but they help you see where to review.",
    fr: "Oui, les questions sont pensées par niveaux : révision, compréhension et application, puis simulation d'examen. Elles ne remplacent pas les sujets officiels, mais t'aident à voir quoi revoir.",
  },
  "Pot cere explicații AI pe fragmente din rezumat sau flashcarduri?": {
    en: "Can I ask for AI explanations on summary fragments or flashcards?",
    fr: "Puis-je demander des explications IA sur des fragments du résumé ou des flashcards ?",
  },
  "Da, în planul Pro poți selecta un text care nu este clar și poți cere o explicație contextuală, legată de materia, proiectul și conținutul încărcat.": {
    en: "Yes, on the Pro plan you can select unclear text and ask for a contextual explanation connected to the subject, project and uploaded content.",
    fr: "Oui, avec le plan Pro tu peux sélectionner un texte peu clair et demander une explication contextuelle liée à la matière, au projet et au contenu importé.",
  },
  "Materialele mele sunt publice?": {
    en: "Are my materials public?",
    fr: "Mes supports sont-ils publics ?",
  },
  "Nu. Materialele sunt asociate contului tău și proiectelor tale. Tu trebuie să ai dreptul să folosești fișierele încărcate, iar conținutul generat trebuie verificat înainte de utilizare.": {
    en: "No. Materials are associated with your account and projects. You must have the right to use uploaded files, and generated content should be checked before use.",
    fr: "Non. Les supports sont associés à ton compte et à tes projets. Tu dois avoir le droit d'utiliser les fichiers importés, et le contenu généré doit être vérifié avant usage.",
  },
  "Există un plan gratuit?": {
    en: "Is there a free plan?",
    fr: "Existe-t-il un plan gratuit ?",
  },
  "Da. Planul Beginner este pentru testarea fluxului cu limite mai mici. Planurile plătite adaugă mai multe materiale, documente mai mari, explicații AI și opțiuni avansate pentru studiu.": {
    en: "Yes. The Beginner plan lets you test the flow with smaller limits. Paid plans add more materials, larger documents, AI explanations and advanced study options.",
    fr: "Oui. Le plan Beginner permet de tester le flux avec des limites plus petites. Les plans payants ajoutent plus de supports, des documents plus volumineux, des explications IA et des options avancées.",
  },
  "Aplicație educațională de quiz-uri.": {
    en: "Educational quiz application.",
    fr: "Application éducative de quiz.",
  },
  "Reviss | Din cursuri în progres real": {
    en: "Reviss | From courses to real progress",
    fr: "Reviss | Des cours au vrai progrès",
  },
  "Transformă PDF-uri și notițe în rezumate, flashcard-uri și quiz-uri personalizate cu Reviss.": {
    en: "Turn PDFs and notes into summaries, flashcards and personalized quizzes with Reviss.",
    fr: "Transforme PDF et notes en résumés, flashcards et quiz personnalisés avec Reviss.",
  },
  "Alege Focus": {
    en: "Choose Focus",
    fr: "Choisir Focus",
  },
  "Nu ai încă proiecte. Încarcă primul curs și începem.": {
    en: "You do not have projects yet. Upload your first course and we will begin.",
    fr: "Tu n'as pas encore de projets. Importe ton premier cours et on commence.",
  },
  "cu pachet generat": {
    en: "with a generated pack",
    fr: "avec un pack généré",
  },
  "Nu ai proiecte încă.": {
    en: "You do not have projects yet.",
    fr: "Tu n'as pas encore de projets.",
  },
  "Niciun proiect încă.": {
    en: "No projects yet.",
    fr: "Aucun projet pour l'instant.",
  },
  "Creează primul proiect, încarcă materialele și Reviss îți pregătește rezumatul, flashcardurile și quizurile.": {
    en: "Create your first project, upload the materials and Reviss prepares your summary, flashcards and quizzes.",
    fr: "Crée ton premier projet, importe les supports et Reviss prépare le résumé, les flashcards et les quiz.",
  },
  "Numele proiectului trebuie să aibă cel puțin 2 caractere.": {
    en: "The project name must have at least 2 characters.",
    fr: "Le nom du projet doit contenir au moins 2 caractères.",
  },
  "Proiectul nu a putut fi redenumit.": {
    en: "The project could not be renamed.",
    fr: "Le projet n'a pas pu être renommé.",
  },
  "Proiectul nu a putut fi arhivat.": {
    en: "The project could not be archived.",
    fr: "Le projet n'a pas pu être archivé.",
  },
  "Proiectul nu a putut fi șters.": {
    en: "The project could not be deleted.",
    fr: "Le projet n'a pas pu être supprimé.",
  },
  "Confirmă ștergerea proiectului.": {
    en: "Confirm project deletion.",
    fr: "Confirme la suppression du projet.",
  },
  "Această acțiune elimină proiectul, materialele convertite și conținutul generat. Pentru păstrare fără afișare, folosește arhivarea.": {
    en: "This action removes the project, converted materials and generated content. To keep it hidden instead, use archive.",
    fr: "Cette action supprime le projet, les supports convertis et le contenu généré. Pour le masquer sans le supprimer, utilise l'archive.",
  },
  "Conținut": {
    en: "Content",
    fr: "Contenu",
  },
  "Materiale, rezumat, flashcard-uri, quiz-uri și progres.": {
    en: "Materials, summary, flashcards, quizzes and progress.",
    fr: "Supports, résumé, flashcards, quiz et progression.",
  },
  "Alternativă": {
    en: "Alternative",
    fr: "Alternative",
  },
  "Arhivează proiectul dacă vrei doar să îl ascunzi temporar.": {
    en: "Archive the project if you only want to hide it temporarily.",
    fr: "Archive le projet si tu veux seulement le masquer temporairement.",
  },
  "Se șterge...": {
    en: "Deleting...",
    fr: "Suppression...",
  },
  "Proiect activ": {
    en: "Active project",
    fr: "Projet actif",
  },
  "Chat AI este disponibil în planul Pro.": {
    en: "AI Chat is available on the Pro plan.",
    fr: "Le chat IA est disponible avec le forfait Pro.",
  },
  "Rezumatul nu este generat încă.": {
    en: "The summary has not been generated yet.",
    fr: "Le résumé n'a pas encore été généré.",
  },
  "Reviss generează automat rezumatul după încărcarea materialelor. Dacă generarea a eșuat, reîncearcă din pagina proiectului.": {
    en: "Reviss generates the summary automatically after materials are uploaded. If generation failed, try again from the project page.",
    fr: "Reviss génère automatiquement le résumé après l'import des supports. Si la génération a échoué, réessaie depuis la page du projet.",
  },
  "Cuvinte cheie din rezumat": {
    en: "Summary keywords",
    fr: "Mots-clés du résumé",
  },
  "Alege modul de lucru.": {
    en: "Choose the working mode.",
    fr: "Choisis le mode de travail.",
  },
  "Ai întrebat despre": {
    en: "You asked about",
    fr: "Tu as demandé au sujet de",
  },
  "Caut legătura cu rezumatul, extrag ideea utilă pentru examen și o formulez pe scurt.": {
    en: "I am linking this to the summary, extracting the exam-useful idea and phrasing it briefly.",
    fr: "Je relie cela au résumé, j'extrais l'idée utile pour l'examen et je la formule brièvement.",
  },
  "Cum să reții": {
    en: "How to remember",
    fr: "Comment retenir",
  },
  "durată est.": {
    en: "est. duration",
    fr: "durée estimée",
  },
  "Interacțiune": {
    en: "Interaction",
    fr: "Interaction",
  },
  "Nu ai flashcarduri marcate pentru recapitulare.": {
    en: "You have no flashcards marked for review.",
    fr: "Tu n'as aucune flashcard marquée pour révision.",
  },
  "Apasă pe iconița cu creierul de pe un flashcard ca să-l adaugi aici.": {
    en: "Press the brain icon on a flashcard to add it here.",
    fr: "Appuie sur l'icône cerveau d'une flashcard pour l'ajouter ici.",
  },
  "Încă nu ai flashcarduri din quizuri.": {
    en: "You do not have quiz flashcards yet.",
    fr: "Tu n'as pas encore de flashcards issues des quiz.",
  },
  "Intră într-un quiz și răspunde. Când greșești, întrebarea și răspunsul corect vor fi salvate automat aici.": {
    en: "Open a quiz and answer. When you make a mistake, the question and correct answer are saved here automatically.",
    fr: "Ouvre un quiz et réponds. Quand tu te trompes, la question et la bonne réponse sont enregistrées ici automatiquement.",
  },
  "Evenimente administrative, acțiuni de cont și erori importante din platformă.": {
    en: "Administrative events, account actions and important platform errors.",
    fr: "Événements administratifs, actions de compte et erreurs importantes de la plateforme.",
  },
  "Caută în jurnal": {
    en: "Search the log",
    fr: "Rechercher dans le journal",
  },
  "Filtrează după acțiune": {
    en: "Filter by action",
    fr: "Filtrer par action",
  },
  "Toate acțiunile": {
    en: "All actions",
    fr: "Toutes les actions",
  },
  "Dată": {
    en: "Date",
    fr: "Date",
  },
  "Resursă": {
    en: "Resource",
    fr: "Ressource",
  },
  "Nu există loguri pentru filtrele alese.": {
    en: "No logs match the selected filters.",
    fr: "Aucun journal ne correspond aux filtres choisis.",
  },
  "Datele firmei.": {
    en: "Company data.",
    fr: "Données de l'entreprise.",
  },
  "Completează informațiile folosite în footer, termeni și politica de confidențialitate.": {
    en: "Fill in the information used in the footer, terms and privacy policy.",
    fr: "Complète les informations utilisées dans le footer, les conditions et la politique de confidentialité.",
  },
  "Resetează": {
    en: "Reset",
    fr: "Réinitialiser",
  },
  "Identitate firmă": {
    en: "Company identity",
    fr: "Identité de l'entreprise",
  },
  "Date juridice afișate în documente.": {
    en: "Legal data displayed in documents.",
    fr: "Données juridiques affichées dans les documents.",
  },
  "Denumire firmă": {
    en: "Company name",
    fr: "Nom de l'entreprise",
  },
  "E-mail contact": {
    en: "Contact email",
    fr: "E-mail de contact",
  },
  "Datele firmei au fost salvate.": {
    en: "Company data has been saved.",
    fr: "Les données de l'entreprise ont été enregistrées.",
  },
  "Datele firmei nu au putut fi salvate.": {
    en: "Company data could not be saved.",
    fr: "Les données de l'entreprise n'ont pas pu être enregistrées.",
  },
  "Secțiuni document": {
    en: "Document sections",
    fr: "Sections du document",
  },
  "Editează direct textul final.": {
    en: "Edit the final text directly.",
    fr: "Modifie directement le texte final.",
  },
  "Salvarea se face pe secțiunea deschisă.": {
    en: "Saving applies to the open section.",
    fr: "L'enregistrement s'applique à la section ouverte.",
  },
  "Editează": {
    en: "Edit",
    fr: "Modifier",
  },
  "Titlu secțiune": {
    en: "Section title",
    fr: "Titre de section",
  },
  "Conținut secțiune": {
    en: "Section content",
    fr: "Contenu de section",
  },
  "Le folosești în text, iar pagina publică le înlocuiește automat cu datele firmei.": {
    en: "Use them in the text, and the public page replaces them automatically with company data.",
    fr: "Utilise-les dans le texte, et la page publique les remplace automatiquement par les données de l'entreprise.",
  },
  "Nu există variabile configurate.": {
    en: "No variables configured.",
    fr: "Aucune variable configurée.",
  },
  "Salvarea actualizează direct conținutul afișat public. Mai târziu putem separa fluxul în draft și publicare.": {
    en: "Saving directly updates the public content. Later we can separate the flow into draft and publishing.",
    fr: "L'enregistrement met à jour directement le contenu public. Plus tard, nous pourrons séparer brouillon et publication.",
  },
  "Nu există planuri configurate momentan.": {
    en: "No plans are configured yet.",
    fr: "Aucun forfait n'est configuré pour le moment.",
  },
  "Configurează prețuri, reduceri, vizibilitate, Stripe și beneficiile afișate în aplicație.": {
    en: "Configure prices, discounts, visibility, Stripe and the benefits shown in the app.",
    fr: "Configure les prix, remises, la visibilité, Stripe et les avantages affichés dans l'application.",
  },
  "Lista activă": {
    en: "Active list",
    fr: "Liste active",
  },
  "Condiții plan": {
    en: "Plan terms",
    fr: "Conditions du forfait",
  },
  "Aceste rânduri apar în cardurile de preț și în pagina de abonament.": {
    en: "These rows appear in pricing cards and on the subscription page.",
    fr: "Ces lignes apparaissent dans les cartes tarifaires et sur la page d'abonnement.",
  },
  "Adaugă opțiune": {
    en: "Add option",
    fr: "Ajouter une option",
  },
  "Câmpuri backend": {
    en: "Backend fields",
    fr: "Champs backend",
  },
  "Plan nou": {
    en: "New plan",
    fr: "Nouveau forfait",
  },
  "Planurile au fost salvate în baza de date.": {
    en: "Plans have been saved to the database.",
    fr: "Les forfaits ont été enregistrés dans la base de données.",
  },
  "Planurile nu au putut fi salvate.": {
    en: "Plans could not be saved.",
    fr: "Les forfaits n'ont pas pu être enregistrés.",
  },
  "Fișiere / proiect": {
    en: "Files / project",
    fr: "Fichiers / projet",
  },
  "MB / proiect": {
    en: "MB / project",
    fr: "Mo / projet",
  },
  "Seturi quiz / nivel": {
    en: "Quiz sets / level",
    fr: "Séries de quiz / niveau",
  },
  "Întrebări / quiz": {
    en: "Questions / quiz",
    fr: "Questions / quiz",
  },
  "Plan vizibil în aplicație": {
    en: "Plan visible in app",
    fr: "Forfait visible dans l'application",
  },
  "Setări admin.": {
    en: "Admin settings.",
    fr: "Paramètres admin.",
  },
  "Controlează conținutul global, planurile, utilizatorii și auditul.": {
    en: "Control global content, plans, users and audit.",
    fr: "Contrôle le contenu global, les forfaits, les utilisateurs et l'audit.",
  },
  "Planuri și abonamente": {
    en: "Plans and subscriptions",
    fr: "Forfaits et abonnements",
  },
  "Listă utilizatori, roluri și detalii de cont.": {
    en: "User list, roles and account details.",
    fr: "Liste des utilisateurs, rôles et détails de compte.",
  },
  "Aplicație și firmă": {
    en: "App and company",
    fr: "Application et entreprise",
  },
  "Legal și firmă": {
    en: "Legal and company",
    fr: "Juridique et entreprise",
  },
  "Catalog abonamente": {
    en: "Subscription catalog",
    fr: "Catalogue des abonnements",
  },
  "Creată": {
    en: "Created",
    fr: "Créée",
  },
  "Expiră": {
    en: "Expires",
    fr: "Expire",
  },
  "Revocată": {
    en: "Revoked",
    fr: "Révoquée",
  },
  "Utilizatorul nu are sesiuni înregistrate.": {
    en: "The user has no recorded sessions.",
    fr: "L'utilisateur n'a aucune session enregistrée.",
  },
  "Date cont": {
    en: "Account data",
    fr: "Données du compte",
  },
  "ID utilizator": {
    en: "User ID",
    fr: "ID utilisateur",
  },
  "Termeni acceptați": {
    en: "Accepted terms",
    fr: "Conditions acceptées",
  },
  "Conturi platformă.": {
    en: "Platform accounts.",
    fr: "Comptes de la plateforme.",
  },
  "Caută conturi, verifică roluri și intră rapid în detaliile fiecărui utilizator.": {
    en: "Search accounts, check roles and quickly open each user's details.",
    fr: "Recherche des comptes, vérifie les rôles et ouvre rapidement les détails de chaque utilisateur.",
  },
  "Caută utilizatori": {
    en: "Search users",
    fr: "Rechercher des utilisateurs",
  },
  "Nu am găsit utilizatori pentru filtrul ales.": {
    en: "No users found for the selected filter.",
    fr: "Aucun utilisateur trouvé pour le filtre choisi.",
  },
  "Caută după nume, email sau ID...": {
    en: "Search by name, email or ID...",
    fr: "Rechercher par nom, e-mail ou ID...",
  },
  "Istoric plăți.": {
    en: "Payment history.",
    fr: "Historique des paiements.",
  },
  "Facturile Stripe pentru abonamentul tău.": {
    en: "Stripe invoices for your subscription.",
    fr: "Factures Stripe pour ton abonnement.",
  },
  "Se încarcă facturile...": {
    en: "Loading invoices...",
    fr: "Chargement des factures...",
  },
  "Nu există încă facturi pentru contul tău.": {
    en: "There are no invoices for your account yet.",
    fr: "Il n'y a pas encore de factures pour ton compte.",
  },
  "Factură": {
    en: "Invoice",
    fr: "Facture",
  },
  "Acțiuni": {
    en: "Actions",
    fr: "Actions",
  },
  "Facturile nu au putut fi încărcate momentan.": {
    en: "Invoices could not be loaded right now.",
    fr: "Les factures n'ont pas pu être chargées pour le moment.",
  },
  "Înapoi la abonamente": {
    en: "Back to subscriptions",
    fr: "Retour aux abonnements",
  },
  "Confirmare abonament": {
    en: "Subscription confirmation",
    fr: "Confirmation d'abonnement",
  },
  "Totul este transparent: planul ales, prețul și beneficiile incluse. Plata se face securizat prin Stripe.": {
    en: "Everything is transparent: selected plan, price and included benefits. Payment is secured through Stripe.",
    fr: "Tout est transparent : forfait choisi, prix et avantages inclus. Le paiement est sécurisé via Stripe.",
  },
  "Planul ales, prețul și beneficiile incluse. Plata se face securizat prin Stripe.": {
    en: "The selected plan, the price and the included benefits. Payment is secured through Stripe.",
    fr: "Le forfait choisi, le prix et les avantages inclus. Le paiement est sécurisé via Stripe.",
  },
  "Îți cerem întâi autentificarea, apoi continui direct spre plată.": {
    en: "We ask you to sign in first, then you go straight to payment.",
    fr: "Nous te demandons d'abord de te connecter, puis tu passes directement au paiement.",
  },
  "Trece pe planul gratuit": {
    en: "Switch to the free plan",
    fr: "Passer au forfait gratuit",
  },
  "Acesta este planul tău": {
    en: "This is your plan",
    fr: "C'est ton forfait",
  },
  "Mergi în cont pentru a-ți continua studiul.": {
    en: "Go to your account to continue studying.",
    fr: "Va dans ton compte pour continuer à étudier.",
  },
  "Planul tău actual rămâne activ până la finalul perioadei plătite.": {
    en: "Your current plan stays active until the end of the paid period.",
    fr: "Ton forfait actuel reste actif jusqu'à la fin de la période payée.",
  },
  "Alege ce proiecte rămân active": {
    en: "Choose which projects stay active",
    fr: "Choisis quels projets restent actifs",
  },
  "Planul s-a schimbat": {
    en: "Your plan changed",
    fr: "Ton forfait a changé",
  },
  "Confirmă selecția": {
    en: "Confirm selection",
    fr: "Confirmer la sélection",
  },
  "Ai folosit toate sloturile.": {
    en: "You have used every slot.",
    fr: "Tu as utilisé tous les emplacements.",
  },
  "Nu am putut salva selecția. Încearcă din nou.": {
    en: "We could not save your selection. Please try again.",
    fr: "Nous n'avons pas pu enregistrer ta sélection. Réessaie.",
  },
  "Indisponibil pe planul curent": {
    en: "Unavailable on your current plan",
    fr: "Indisponible avec ton forfait actuel",
  },
  "Proiect dezactivat pe planul curent": {
    en: "Project deactivated on your current plan",
    fr: "Projet désactivé avec ton forfait actuel",
  },
  "Dezactivare": {
    en: "Deactivate",
    fr: "Désactiver",
  },
  "Activare": {
    en: "Activate",
    fr: "Activer",
  },
  "Starea proiectului nu a putut fi schimbată.": {
    en: "The project state could not be changed.",
    fr: "L'état du projet n'a pas pu être modifié.",
  },
  "Dezactivat": {
    en: "Deactivated",
    fr: "Désactivé",
  },
  "Proiecte active simultan": {
    en: "Projects active at once",
    fr: "Projets actifs simultanément",
  },
  "Proiecte noi pe lună": {
    en: "New projects per month",
    fr: "Nouveaux projets par mois",
  },
  "Peste această limită proiectele se dezactivează": {
    en: "Projects beyond this limit are deactivated",
    fr: "Les projets au-delà de cette limite sont désactivés",
  },
  "Îți creezi contul în câțiva pași, fără card.": {
    en: "You create your account in a few steps, no card needed.",
    fr: "Tu crées ton compte en quelques étapes, sans carte.",
  },
  "După plată, planul devine activ imediat. Îl poți schimba sau anula din cont.": {
    en: "After payment, the plan becomes active immediately. You can change or cancel it from your account.",
    fr: "Après paiement, le forfait devient actif immédiatement. Tu peux le modifier ou l'annuler depuis ton compte.",
  },
  "Planul nu are încă un Stripe Price ID configurat în administrare.": {
    en: "The plan does not have a Stripe Price ID configured in admin yet.",
    fr: "Le forfait n'a pas encore d'ID de prix Stripe configuré dans l'administration.",
  },
  "Continuă în cont": {
    en: "Continue to account",
    fr: "Continuer vers le compte",
  },
  "Trebuie să fii autentificat ca să activezi un abonament.": {
    en: "You must be logged in to activate a subscription.",
    fr: "Tu dois être connecté pour activer un abonnement.",
  },
  "Dacă adresa există în platformă, emailul este deja pe drum.": {
    en: "If the address exists in the platform, the email is already on its way.",
    fr: "Si l'adresse existe sur la plateforme, l'e-mail est déjà en route.",
  },
  "Pentru siguranță, poți solicita un nou link după expirarea celui curent.": {
    en: "For security, you can request a new link after the current one expires.",
    fr: "Pour ta sécurité, tu peux demander un nouveau lien après l'expiration de celui-ci.",
  },
  "Poți folosi linkul o singură dată. Dacă nu îl vezi, verifică și folderul Spam sau Promotions.": {
    en: "You can use the link only once. If you do not see it, also check Spam or Promotions.",
    fr: "Tu peux utiliser le lien une seule fois. Si tu ne le vois pas, vérifie aussi Spam ou Promotions.",
  },
  "Linkul este valabil 30 de minute. Dacă nu îl vezi, verifică și folderul Spam sau Promotions.": {
    en: "The link is valid for 30 minutes. If you do not see it, also check Spam or Promotions.",
    fr: "Le lien est valable 30 minutes. Si tu ne le vois pas, vérifie aussi Spam ou Promotions.",
  },
  "Îți vom trimite un link securizat. Acesta va putea fi folosit o singură dată și va expira automat.": {
    en: "We will send you a secure link. It can be used once and expires automatically.",
    fr: "Nous t'enverrons un lien sécurisé. Il pourra être utilisé une seule fois et expirera automatiquement.",
  },
  "Am citit și accept": {
    en: "I have read and accept",
    fr: "J'ai lu et j'accepte",
  },
  "Termenii și condițiile": {
    en: "Terms and Conditions",
    fr: "Conditions générales",
  },
  "Informațiile despre prelucrarea datelor sunt disponibile în": {
    en: "Information about data processing is available in",
    fr: "Les informations sur le traitement des données sont disponibles dans",
  },
  "Doresc să primesc noutăți și oferte prin e-mail.": {
    en: "I want to receive news and offers by email.",
    fr: "Je souhaite recevoir des nouveautés et offres par e-mail.",
  },
  "Linkul de resetare lipsește sau este incomplet.": {
    en: "The reset link is missing or incomplete.",
    fr: "Le lien de réinitialisation est manquant ou incomplet.",
  },
  "Parola nu a putut fi actualizată momentan.": {
    en: "The password could not be updated right now.",
    fr: "Le mot de passe n'a pas pu être mis à jour pour le moment.",
  },
  "Se actualizează...": {
    en: "Updating...",
    fr: "Mise à jour...",
  },
  "Linkul de confirmare lipsește sau este incomplet.": {
    en: "The confirmation link is missing or incomplete.",
    fr: "Le lien de confirmation est manquant ou incomplet.",
  },
  "Nu am putut confirma emailul momentan.": {
    en: "We could not confirm the email right now.",
    fr: "Nous n'avons pas pu confirmer l'e-mail pour le moment.",
  },
  "Continuă să construiești pe ce ai învățat.": {
    en: "Keep building on what you learned.",
    fr: "Continue à construire sur ce que tu as appris.",
  },
  "Intră în cont pentru a-ți relua sesiunile, quiz-urile și progresul exact de unde ai rămas.": {
    en: "Log in to resume your sessions, quizzes and progress exactly where you left off.",
    fr: "Connecte-toi pour reprendre tes sessions, quiz et progrès exactement là où tu t'étais arrêté.",
  },
  "Nu ai încă un cont?": {
    en: "Do not have an account yet?",
    fr: "Tu n'as pas encore de compte ?",
  },
  "Ritmul tău. Progresul tău.": {
    en: "Your pace. Your progress.",
    fr: "Ton rythme. Ta progression.",
  },
  "Reviss organizează materialele de curs într-un spațiu calm, clar și ușor de reluat în fiecare zi.": {
    en: "Reviss organizes course materials in a calm, clear space that is easy to resume every day.",
    fr: "Reviss organise les supports de cours dans un espace calme, clair et facile à reprendre chaque jour.",
  },
  "Quiz-uri adaptate nivelului tău": {
    en: "Quizzes adapted to your level",
    fr: "Quiz adaptés à ton niveau",
  },
  "Progres păstrat între sesiuni": {
    en: "Progress saved between sessions",
    fr: "Progression conservée entre les sessions",
  },
  "Recapitulări programate inteligent": {
    en: "Smart scheduled reviews",
    fr: "Révisions programmées intelligemment",
  },
  "Începe gratuit": {
    en: "Start free",
    fr: "Commencer gratuitement",
  },
  "Creează-ți un spațiu de studiu care lucrează cu tine.": {
    en: "Create a study space that works with you.",
    fr: "Crée un espace d'étude qui travaille avec toi.",
  },
  "Un singur cont pentru cursuri, flashcard-uri, quiz-uri și o imagine clară asupra progresului tău.": {
    en: "One account for courses, flashcards, quizzes and a clear view of your progress.",
    fr: "Un seul compte pour les cours, flashcards, quiz et une vue claire sur ta progression.",
  },
  "Ai deja un cont?": {
    en: "Already have an account?",
    fr: "Tu as déjà un compte ?",
  },
  "Autentifică-te": {
    en: "Log in",
    fr: "Connecte-toi",
  },
  "Mai puțin haos. Mai multă claritate.": {
    en: "Less chaos. More clarity.",
    fr: "Moins de chaos. Plus de clarté.",
  },
  "Transformă notițele în pași mici și măsurabili, într-o interfață concepută pentru concentrare.": {
    en: "Turn notes into small, measurable steps in an interface designed for focus.",
    fr: "Transforme les notes en petites étapes mesurables dans une interface conçue pour la concentration.",
  },
  "Plan personal de învățare": {
    en: "Personal learning plan",
    fr: "Plan d'apprentissage personnel",
  },
  "Temă luminoasă și Warm Night": {
    en: "Light theme and Warm Night",
    fr: "Thème clair et Warm Night",
  },
  "Recuperează accesul": {
    en: "Recover access",
    fr: "Récupérer l'accès",
  },
  "Revino la cursurile tale în câteva clipe.": {
    en: "Return to your courses in a few moments.",
    fr: "Reviens à tes cours en quelques instants.",
  },
  "Introdu adresa asociată contului, iar noi îți trimitem instrucțiunile pentru alegerea unei parole noi.": {
    en: "Enter the address linked to your account and we will send instructions for choosing a new password.",
    fr: "Saisis l'adresse associée à ton compte et nous t'enverrons les instructions pour choisir un nouveau mot de passe.",
  },
  "Progresul tău rămâne aici.": {
    en: "Your progress stays here.",
    fr: "Ta progression reste ici.",
  },
  "Resetarea parolei nu afectează cursurile, flashcard-urile sau istoricul sesiunilor tale.": {
    en: "Resetting the password does not affect your courses, flashcards or session history.",
    fr: "La réinitialisation du mot de passe n'affecte pas tes cours, flashcards ni l'historique des sessions.",
  },
  "Materialele și progresul rămân salvate": {
    en: "Materials and progress stay saved",
    fr: "Les supports et la progression restent enregistrés",
  },
  "Acces rapid înapoi la studiu": {
    en: "Quick access back to study",
    fr: "Retour rapide à l'étude",
  },
  "Linkul de resetare poate fi folosit o singură dată, apoi sesiunile vechi sunt închise automat.": {
    en: "The reset link can be used once, then old sessions are closed automatically.",
    fr: "Le lien de réinitialisation peut être utilisé une seule fois, puis les anciennes sessions sont fermées automatiquement.",
  },
  "Resetare sigură, fără să pierzi progresul.": {
    en: "Secure reset without losing progress.",
    fr: "Réinitialisation sécurisée sans perdre ta progression.",
  },
  "Materialele, quiz-urile și flashcard-urile rămân salvate în contul tău.": {
    en: "Materials, quizzes and flashcards remain saved in your account.",
    fr: "Les supports, quiz et flashcards restent enregistrés dans ton compte.",
  },
  "Token cu expirare automată": {
    en: "Token with automatic expiration",
    fr: "Jeton avec expiration automatique",
  },
  "Sesiunile vechi se închid după resetare": {
    en: "Old sessions close after reset",
    fr: "Les anciennes sessions se ferment après la réinitialisation",
  },
  "Progresul rămâne neschimbat": {
    en: "Progress stays unchanged",
    fr: "La progression reste inchangée",
  },
  "Confirmare email": {
    en: "Email confirmation",
    fr: "Confirmation e-mail",
  },
  "Validăm adresa înainte să creăm contul.": {
    en: "We validate the address before creating the account.",
    fr: "Nous validons l'adresse avant de créer le compte.",
  },
  "Acest pas păstrează platforma curată și confirmă că adresa îți aparține.": {
    en: "This step keeps the platform clean and confirms that the address belongs to you.",
    fr: "Cette étape garde la plateforme propre et confirme que l'adresse t'appartient.",
  },
  "Ai deja cont confirmat?": {
    en: "Already have a confirmed account?",
    fr: "Tu as déjà un compte confirmé ?",
  },
  "Un cont sigur pornește cu o adresă verificată.": {
    en: "A secure account starts with a verified address.",
    fr: "Un compte sûr commence par une adresse vérifiée.",
  },
  "După confirmare vei fi autentificat automat și trimis în spațiul tău de studiu.": {
    en: "After confirmation you will be signed in automatically and sent to your study space.",
    fr: "Après confirmation, tu seras connecté automatiquement et envoyé vers ton espace d'étude.",
  },
  "Validare înainte de creare cont": {
    en: "Validation before account creation",
    fr: "Validation avant création du compte",
  },
  "Sesiune creată automat după confirmare": {
    en: "Session created automatically after confirmation",
    fr: "Session créée automatiquement après confirmation",
  },
  "Link cu expirare și utilizare unică": {
    en: "Expiring one-time link",
    fr: "Lien à usage unique avec expiration",
  },
  "Notă de securitate": {
    en: "Security note",
    fr: "Note de sécurité",
  },
  "Sesiunea curentă este protejată prin cookie HttpOnly. Acțiunile avansate vor fi conectate gradual la backend.": {
    en: "The current session is protected by an HttpOnly cookie. Advanced actions will be connected gradually to the backend.",
    fr: "La session actuelle est protégée par un cookie HttpOnly. Les actions avancées seront reliées progressivement au backend.",
  },
  "Sesiune": {
    en: "Session",
    fr: "Session",
  },
  "Tokenul nu este expus în JavaScript": {
    en: "The token is not exposed in JavaScript",
    fr: "Le jeton n'est pas exposé dans JavaScript",
  },
  "Neverificat": {
    en: "Unverified",
    fr: "Non vérifié",
  },
  "Statusul curent al autentificării": {
    en: "Current authentication status",
    fr: "Statut actuel de l'authentification",
  },
  "Rol acces": {
    en: "Access role",
    fr: "Rôle d'accès",
  },
  "Permisiuni active în aplicație": {
    en: "Active permissions in the app",
    fr: "Autorisations actives dans l'application",
  },
  "Acțiuni securitate": {
    en: "Security actions",
    fr: "Actions de sécurité",
  },
  "Pregătit pentru integrarea backend.": {
    en: "Ready for backend integration.",
    fr: "Prêt pour l'intégration backend.",
  },
  "Șterge contul": {
    en: "Delete account",
    fr: "Supprimer le compte",
  },
  "Acțiune critică, dezactivată momentan.": {
    en: "Critical action, currently disabled.",
    fr: "Action critique, désactivée pour le moment.",
  },
  "Ștergere cont": {
    en: "Account deletion",
    fr: "Suppression du compte",
  },
  "Acțiunile critice cer reconfirmare. Datele fiscale sau cele necesare apărării drepturilor pot fi păstrate cât cere legea.": {
    en: "Critical actions require reconfirmation. Fiscal data or data needed to defend rights may be kept as long as the law requires.",
    fr: "Les actions critiques nécessitent une reconfirmation. Les données fiscales ou nécessaires à la défense des droits peuvent être conservées selon la loi.",
  },
  "Cookie-uri": {
    en: "Cookies",
    fr: "Cookies",
  },
  "Configurabile": {
    en: "Configurable",
    fr: "Configurables",
  },
  "Acordul poate fi modificat oricând": {
    en: "Consent can be changed anytime",
    fr: "Le consentement peut être modifié à tout moment",
  },
  "Export date": {
    en: "Data export",
    fr: "Export des données",
  },
  "La cerere": {
    en: "On request",
    fr: "Sur demande",
  },
  "Pregătit pentru endpoint backend": {
    en: "Ready for backend endpoint",
    fr: "Prêt pour l'endpoint backend",
  },
  "Date și confidențialitate": {
    en: "Data and privacy",
    fr: "Données et confidentialité",
  },
  "Descarcă datele contului": {
    en: "Download account data",
    fr: "Télécharger les données du compte",
  },
  "Include profilul, preferințele, proiectele și istoricul disponibil pentru contul tău.": {
    en: "Includes your profile, preferences, projects and available account history.",
    fr: "Inclut ton profil, tes préférences, projets et l'historique disponible du compte.",
  },
  "Șterge materialele încărcate": {
    en: "Delete uploaded materials",
    fr: "Supprimer les supports importés",
  },
  "Elimină fișierele sursă asociate proiectelor tale.": {
    en: "Removes source files associated with your projects.",
    fr: "Supprime les fichiers source associés à tes projets.",
  },
  "Șterge flashcard-urile": {
    en: "Delete flashcards",
    fr: "Supprimer les flashcards",
  },
  "Elimină cardurile generate automat din proiecte.": {
    en: "Removes automatically generated cards from projects.",
    fr: "Supprime les cartes générées automatiquement des projets.",
  },
  "Retrage consimțământul newsletter": {
    en: "Withdraw newsletter consent",
    fr: "Retirer le consentement newsletter",
  },
  "Oprește comunicările comerciale prin e-mail.": {
    en: "Stops commercial email communications.",
    fr: "Arrête les communications commerciales par e-mail.",
  },
  "Necesită reconfirmarea parolei sau confirmare prin e-mail.": {
    en: "Requires password reconfirmation or email confirmation.",
    fr: "Nécessite une reconfirmation du mot de passe ou une confirmation par e-mail.",
  },
  "Poți modifica sau retrage acordul pentru cookie-urile opționale oricând.": {
    en: "You can change or withdraw consent for optional cookies anytime.",
    fr: "Tu peux modifier ou retirer ton accord pour les cookies optionnels à tout moment.",
  },
  "Arhiva proiectelor": {
    en: "Project archive",
    fr: "Archive des projets",
  },
  "Proiectele arhivate sunt ascunse din dashboard și pot fi restabilite dintr-o fereastră separată.": {
    en: "Archived projects are hidden from the dashboard and can be restored from a separate window.",
    fr: "Les projets archivés sont masqués du dashboard et peuvent être restaurés depuis une fenêtre séparée.",
  },
  "Vezi arhiva": {
    en: "View archive",
    fr: "Voir l'archive",
  },
  "Proiecte arhivate": {
    en: "Archived projects",
    fr: "Projets archivés",
  },
  "Restabilește proiectele pe care vrei să le readuci în dashboard sau șterge-le definitiv.": {
    en: "Restore projects you want back in the dashboard or delete them permanently.",
    fr: "Restaure les projets à remettre dans le dashboard ou supprime-les définitivement.",
  },
  "Se încarcă arhiva...": {
    en: "Loading archive...",
    fr: "Chargement de l'archive...",
  },
  "Nu ai proiecte arhivate.": {
    en: "You have no archived projects.",
    fr: "Tu n'as aucun projet archivé.",
  },
  "Această acțiune elimină proiectul și fișierele lui. Dacă vrei să-l folosești din nou, alege Restabilește.": {
    en: "This action removes the project and its files. If you want to use it again, choose Restore.",
    fr: "Cette action supprime le projet et ses fichiers. Si tu veux le réutiliser, choisis Restaurer.",
  },
  "Limba aplicației": {
    en: "Application language",
    fr: "Langue de l'application",
  },
  "Preferința este salvată pe cont și se aplică după autentificare.": {
    en: "The preference is saved on your account and applies after login.",
    fr: "La préférence est enregistrée sur ton compte et s'applique après connexion.",
  },
  "Stabilită de abonamentul activ": {
    en: "Set by the active subscription",
    fr: "Définie par l'abonnement actif",
  },
  "Alege ritmul": {
    en: "Choose the pace",
    fr: "Choisir le rythme",
  },
  "Configurată separat în Culori": {
    en: "Configured separately in Colors",
    fr: "Configurée séparément dans Couleurs",
  },
  "Preferință cont": {
    en: "Account preference",
    fr: "Préférence du compte",
  },
  "Un singur email cu ce contează pentru azi.": {
    en: "One email with what matters today.",
    fr: "Un seul e-mail avec l'essentiel du jour.",
  },
  "Proiecte ascunse din dashboard": {
    en: "Projects hidden from dashboard",
    fr: "Projets masqués du dashboard",
  },
  "Confidențialitate și date.": {
    en: "Privacy and data.",
    fr: "Confidentialité et données.",
  },
  "Exportă, șterge sau modifică acordurile legate de datele contului.": {
    en: "Export, delete or change consents related to account data.",
    fr: "Exporte, supprime ou modifie les accords liés aux données du compte.",
  },
  "Consimțământ cookie": {
    en: "Cookie consent",
    fr: "Consentement aux cookies",
  },
  "Setări cookie Reviss": {
    en: "Reviss cookie settings",
    fr: "Paramètres des cookies Reviss",
  },
  "Folosim cookie-uri necesare pentru funcționare. Cookie-urile funcționale, de analiză și marketing sunt opționale și nu se activează fără acordul tău.": {
    en: "We use necessary cookies for operation. Functional, analytics and marketing cookies are optional and are not enabled without your consent.",
    fr: "Nous utilisons des cookies nécessaires au fonctionnement. Les cookies fonctionnels, d'analyse et marketing sont optionnels et ne s'activent pas sans ton accord.",
  },
  "Acceptă toate": {
    en: "Accept all",
    fr: "Tout accepter",
  },
  "Respinge cookie-urile opționale": {
    en: "Reject optional cookies",
    fr: "Refuser les cookies optionnels",
  },
  "Personalizează": {
    en: "Customize",
    fr: "Personnaliser",
  },
  "Preferințe cookie": {
    en: "Cookie preferences",
    fr: "Préférences des cookies",
  },
  "Alege ce cookie-uri accepți.": {
    en: "Choose which cookies you accept.",
    fr: "Choisis les cookies que tu acceptes.",
  },
  "Poți modifica oricând aceste setări din footer. Cookie-urile necesare rămân active pentru autentificare și securitate.": {
    en: "You can change these settings anytime from the footer. Necessary cookies stay active for authentication and security.",
    fr: "Tu peux modifier ces paramètres à tout moment depuis le footer. Les cookies nécessaires restent actifs pour l'authentification et la sécurité.",
  },
  "Închide setările cookie": {
    en: "Close cookie settings",
    fr: "Fermer les paramètres des cookies",
  },
  "mereu active": {
    en: "always active",
    fr: "toujours actifs",
  },
  "Salvează preferințele": {
    en: "Save preferences",
    fr: "Enregistrer les préférences",
  },
  "Respinge opționalele": {
    en: "Reject optional",
    fr: "Refuser les optionnels",
  },
  "Ne-ar ajuta să înțelegem cum este folosit produsul. Nu încărcăm analytics fără acord.": {
    en: "They would help us understand how the product is used. We do not load analytics without consent.",
    fr: "Ils nous aideraient à comprendre l'utilisation du produit. Nous ne chargeons pas d'analyse sans consentement.",
  },
  "Ar permite campanii și măsurare de marketing. Nu încărcăm scripturi de marketing fără acord.": {
    en: "They would allow campaigns and marketing measurement. We do not load marketing scripts without consent.",
    fr: "Ils permettraient les campagnes et la mesure marketing. Nous ne chargeons pas de scripts marketing sans consentement.",
  },
  "Păstrează autentificarea, securitatea și funcțiile de bază ale platformei.": {
    en: "Keeps authentication, security and core platform functions working.",
    fr: "Maintient l'authentification, la sécurité et les fonctions de base de la plateforme.",
  },
  "Memorează preferințe precum tema, setările de interfață și opțiunile de studiu.": {
    en: "Stores preferences such as theme, interface settings and study options.",
    fr: "Mémorise des préférences comme le thème, les paramètres d'interface et les options d'étude.",
  },
  "Contact și suport.": {
    en: "Contact and support.",
    fr: "Contact et support.",
  },
  "Folosește formularul pentru întrebări despre cont, facturare, date personale sau raportarea conținutului.": {
    en: "Use the form for questions about account, billing, personal data or content reporting.",
    fr: "Utilise le formulaire pour les questions de compte, facturation, données personnelles ou signalement de contenu.",
  },
  "Alege categoria": {
    en: "Choose category",
    fr: "Choisir la catégorie",
  },
  "Facturare": {
    en: "Billing",
    fr: "Facturation",
  },
  "Raportare conținut": {
    en: "Content report",
    fr: "Signalement de contenu",
  },
  "Subiect": {
    en: "Subject",
    fr: "Sujet",
  },
  "Mesaj": {
    en: "Message",
    fr: "Message",
  },
  "Confirm că acest mesaj nu este spam și că informațiile trimise sunt corecte.": {
    en: "I confirm this message is not spam and the submitted information is correct.",
    fr: "Je confirme que ce message n'est pas du spam et que les informations envoyées sont correctes.",
  },
  "Se trimite...": {
    en: "Sending...",
    fr: "Envoi...",
  },
  "Trimite mesajul": {
    en: "Send message",
    fr: "Envoyer le message",
  },
  "Solicitarea nu a putut fi trimisă.": {
    en: "The request could not be sent.",
    fr: "La demande n'a pas pu être envoyée.",
  },
  "Confirmă protecția anti-spam înainte de trimitere.": {
    en: "Confirm anti-spam protection before sending.",
    fr: "Confirme la protection anti-spam avant l'envoi.",
  },
  "Mesajul a fost trimis. Îți vom răspunde pe e-mail.": {
    en: "The message was sent. We will reply by email.",
    fr: "Le message a été envoyé. Nous répondrons par e-mail.",
  },
  "Mesajul nu a putut fi trimis.": {
    en: "The message could not be sent.",
    fr: "Le message n'a pas pu être envoyé.",
  },
  "E-mail asociat contului": {
    en: "Email linked to the account",
    fr: "E-mail associé au compte",
  },
  "Abonamentul sau comanda": {
    en: "Subscription or order",
    fr: "Abonnement ou commande",
  },
  "Numărul comenzii, dacă există": {
    en: "Order number, if any",
    fr: "Numéro de commande, le cas échéant",
  },
  "Motiv opțional": {
    en: "Optional reason",
    fr: "Motif optionnel",
  },
  "Confirm că doresc retragerea din contract pentru abonamentul sau comanda indicată.": {
    en: "I confirm that I want to withdraw from the contract for the indicated subscription or order.",
    fr: "Je confirme vouloir me rétracter du contrat pour l'abonnement ou la commande indiquée.",
  },
  "Se înregistrează...": {
    en: "Registering...",
    fr: "Enregistrement...",
  },
  "Confirmă retragerea": {
    en: "Confirm withdrawal",
    fr: "Confirmer la rétractation",
  },
  "Confirmă solicitarea de retragere înainte de trimitere.": {
    en: "Confirm the withdrawal request before sending.",
    fr: "Confirme la demande de rétractation avant l'envoi.",
  },
  "Solicitarea de retragere a fost înregistrată și confirmarea a fost pusă în coada de e-mail.": {
    en: "The withdrawal request was registered and the confirmation was queued for email.",
    fr: "La demande de rétractation a été enregistrée et la confirmation placée dans la file d'e-mail.",
  },
  "Tipul sesizării": {
    en: "Report type",
    fr: "Type de signalement",
  },
  "Alege tipul": {
    en: "Choose type",
    fr: "Choisir le type",
  },
  "Drepturi de autor": {
    en: "Copyright",
    fr: "Droits d'auteur",
  },
  "Date personale": {
    en: "Personal data",
    fr: "Données personnelles",
  },
  "Conținut incorect": {
    en: "Incorrect content",
    fr: "Contenu incorrect",
  },
  "Alt motiv": {
    en: "Other reason",
    fr: "Autre motif",
  },
  "Linkul sau identificatorul conținutului": {
    en: "Content link or identifier",
    fr: "Lien ou identifiant du contenu",
  },
  "Descriere": {
    en: "Description",
    fr: "Description",
  },
  "Dovada drepturilor, opțional": {
    en: "Rights evidence, optional",
    fr: "Preuve des droits, optionnelle",
  },
  "Declar că informațiile furnizate sunt corecte și că solicitarea este făcută cu bună-credință.": {
    en: "I declare the provided information is correct and the request is made in good faith.",
    fr: "Je déclare que les informations fournies sont correctes et que la demande est faite de bonne foi.",
  },
  "Trimite sesizarea": {
    en: "Send report",
    fr: "Envoyer le signalement",
  },
  "Confirmă declarația privind corectitudinea informațiilor.": {
    en: "Confirm the declaration about the accuracy of the information.",
    fr: "Confirme la déclaration concernant l'exactitude des informations.",
  },
  "Sesizarea a fost înregistrată și va fi analizată.": {
    en: "The report was registered and will be reviewed.",
    fr: "Le signalement a été enregistré et sera analysé.",
  },
  "Sesizarea nu a putut fi trimisă.": {
    en: "The report could not be sent.",
    fr: "Le signalement n'a pas pu être envoyé.",
  },
  "Operator": {
    en: "Operator",
    fr: "Opérateur",
  },
  "Sediu social": {
    en: "Registered office",
    fr: "Siège social",
  },
  "Telefon": {
    en: "Phone",
    fr: "Téléphone",
  },
  "Nr. Registrul Comerțului": {
    en: "Trade Register no.",
    fr: "N° registre du commerce",
  },
  "Transformă materialele de studiu în flashcard-uri generate automat.": {
    en: "Turn study materials into automatically generated flashcards.",
    fr: "Transforme les supports d'étude en flashcards générées automatiquement.",
  },
  "Asistență": {
    en: "Support",
    fr: "Assistance",
  },
  "Generate initial": {
    en: "Initially generated",
    fr: "Générées initialement",
  },
  "Din quiz-urile tale": {
    en: "From your quizzes",
    fr: "Depuis tes quiz",
  },
  "Create de tine": {
    en: "Created by you",
    fr: "Créées par toi",
  },
  "Flashcardurile tale": {
    en: "Your flashcards",
    fr: "Tes flashcards",
  },
  "Flashcardurile create manual rămân separate de cele generate automat.": {
    en: "Manually created flashcards stay separate from automatically generated ones.",
    fr: "Les flashcards créées manuellement restent séparées de celles générées automatiquement.",
  },
  "Flashcardurile nu sunt generate încă": {
    en: "Flashcards are not generated yet",
    fr: "Les flashcards ne sont pas encore générées",
  },
  "Pachetul generat automat din materialele încărcate, pregătit pentru recapitulare activă.": {
    en: "The pack automatically generated from uploaded materials, ready for active review.",
    fr: "Le pack généré automatiquement depuis les supports importés, prêt pour une révision active.",
  },
  "Flashcardurile apar aici după ce Reviss termină generarea pachetului de studiu.": {
    en: "Flashcards appear here after Reviss finishes generating the study pack.",
    fr: "Les flashcards apparaissent ici quand Reviss termine la génération du pack d'étude.",
  },
  "Întrebările greșite transformate în flashcarduri": {
    en: "Wrong answers turned into flashcards",
    fr: "Questions ratées transformées en flashcards",
  },
  "Aici apar întrebările greșite": {
    en: "Wrong questions appear here",
    fr: "Les questions ratées apparaissent ici",
  },
  "Fiecare greșeală din quiz devine automat un card de recapitulare.": {
    en: "Every quiz mistake automatically becomes a review card.",
    fr: "Chaque erreur de quiz devient automatiquement une carte de révision.",
  },
  "Fă un quiz. Când greșești, Reviss pune întrebarea și răspunsul corect aici.": {
    en: "Take a quiz. When you make a mistake, Reviss puts the question and correct answer here.",
    fr: "Fais un quiz. Quand tu te trompes, Reviss place ici la question et la bonne réponse.",
  },
  "Scoate flashcardul din recapitulare": {
    en: "Remove flashcard from review",
    fr: "Retirer la flashcard de la révision",
  },
  "Marchează flashcardul pentru recapitulare": {
    en: "Mark flashcard for review",
    fr: "Marquer la flashcard pour révision",
  },
  "Text selectat din întrebare": {
    en: "Selected text from question",
    fr: "Texte sélectionné dans la question",
  },
  "Text selectat din răspuns": {
    en: "Selected text from answer",
    fr: "Texte sélectionné dans la réponse",
  },
  "Răspunsul nu a putut fi generat momentan. Încearcă din nou.": {
    en: "The answer could not be generated right now. Try again.",
    fr: "La réponse n'a pas pu être générée pour le moment. Réessaie.",
  },
  "Nu am putut genera un răspuns util momentan. Încearcă din nou peste câteva momente.": {
    en: "I could not generate a useful answer right now. Try again in a few moments.",
    fr: "Je n'ai pas pu générer de réponse utile pour le moment. Réessaie dans quelques instants.",
  },
  "Reviss pregătește răspunsul": {
    en: "Reviss is preparing the answer",
    fr: "Reviss prépare la réponse",
  },
  "Chat nou": {
    en: "New chat",
    fr: "Nouveau chat",
  },
  "Mesaj pentru Chat AI": {
    en: "Message for AI Chat",
    fr: "Message pour le chat IA",
  },
  "Scrie un mesaj...": {
    en: "Write a message...",
    fr: "Écris un message...",
  },
  "Trimite": {
    en: "Send",
    fr: "Envoyer",
  },
  "Explicația nu este disponibilă momentan": {
    en: "The explanation is not available right now",
    fr: "L'explication n'est pas disponible pour le moment",
  },
  "Nu am putut genera explicația. Încearcă din nou peste câteva momente.": {
    en: "I could not generate the explanation. Try again in a few moments.",
    fr: "Je n'ai pas pu générer l'explication. Réessaie dans quelques instants.",
  },
  "Verifică dacă ai selectat un fragment clar din flashcard.": {
    en: "Check that you selected a clear fragment from the flashcard.",
    fr: "Vérifie que tu as sélectionné un fragment clair de la flashcard.",
  },
  "Poți continua recapitularea și poți reveni la explicație mai târziu.": {
    en: "You can continue reviewing and return to the explanation later.",
    fr: "Tu peux continuer la révision et revenir à l'explication plus tard.",
  },
  "Aplică": {
    en: "Apply",
    fr: "Appliquer",
  },
  "Selectează un fragment, apoi apasă Aplică pe selecție.": {
    en: "Select a fragment, then press Apply to selection.",
    fr: "Sélectionne un fragment, puis appuie sur Appliquer à la sélection.",
  },
  "Apasă pe un text evidențiat ca să-l ștergi.": {
    en: "Click highlighted text to delete it.",
    fr: "Clique sur un texte surligné pour le supprimer.",
  },
  "Selectează un fragment, apoi confirmă cu Întreabă.": {
    en: "Select a fragment, then confirm with Ask.",
    fr: "Sélectionne un fragment, puis confirme avec Demander.",
  },
  "Selectează un fragment ca să adaugi o notiță.": {
    en: "Select a fragment to add a note.",
    fr: "Sélectionne un fragment pour ajouter une note.",
  },
  "Text selectat pentru AI": {
    en: "Text selected for AI",
    fr: "Texte sélectionné pour l'IA",
  },
  "Scrie o notiță aici...": {
    en: "Write a note here...",
    fr: "Écris une note ici...",
  },
  "Închide instrumentele": {
    en: "Close tools",
    fr: "Fermer les outils",
  },
  "Generez explicația": {
    en: "Generating explanation",
    fr: "Génération de l'explication",
  },
  "Analizez fragmentul...": {
    en: "Analyzing the fragment...",
    fr: "Analyse du fragment...",
  },
  "Reviss AI": {
    en: "Reviss AI",
    fr: "Reviss IA",
  },
  "Culoare highlight": {
    en: "Highlight color",
    fr: "Couleur du surlignage",
  },
  "Galben": {
    en: "Yellow",
    fr: "Jaune",
  },
  "Verde": {
    en: "Green",
    fr: "Vert",
  },
  "Albastru": {
    en: "Blue",
    fr: "Bleu",
  },
  "Roz": {
    en: "Pink",
    fr: "Rose",
  },
  "Mov": {
    en: "Purple",
    fr: "Violet",
  },
  "Schimbă culoarea pentru": {
    en: "Change color for",
    fr: "Changer la couleur pour",
  },
  "Apasă pentru a șterge highlight-ul": {
    en: "Press to delete the highlight",
    fr: "Appuie pour supprimer le surlignage",
  },
  "Vezi notița": {
    en: "View note",
    fr: "Voir la note",
  },
  "Șterge notița": {
    en: "Delete note",
    fr: "Supprimer la note",
  },
  "Pro": {
    en: "Pro",
    fr: "Pro",
  },
  "Vezi planul Pro": {
    en: "View Pro plan",
    fr: "Voir le forfait Pro",
  },
  "Funcționalitatea AI este disponibilă doar pentru planul Pro.": {
    en: "AI functionality is available only on the Pro plan.",
    fr: "La fonctionnalité IA est disponible uniquement avec le forfait Pro.",
  },
  "Treci la Pro ca să folosești explicații AI, întrebări pe text selectat și Chat AI contextual.": {
    en: "Upgrade to Pro to use AI explanations, selected-text questions and contextual AI Chat.",
    fr: "Passe à Pro pour utiliser les explications IA, les questions sur texte sélectionné et le chat IA contextuel.",
  },
  "Generarea nu este disponibilă momentan. Încearcă din nou în câteva minute.": {
    en: "Generation is not available right now. Try again in a few minutes.",
    fr: "La génération n'est pas disponible pour le moment. Réessaie dans quelques minutes.",
  },
  "Pachetul nu a putut fi generat momentan. Încearcă din nou.": {
    en: "The pack could not be generated right now. Try again.",
    fr: "Le pack n'a pas pu être généré pour le moment. Réessaie.",
  },
  "creează pachet": {
    en: "creating pack",
    fr: "création du pack",
  },
  "creează quizuri": {
    en: "creating quizzes",
    fr: "création des quiz",
  },
  "în așteptare": {
    en: "waiting",
    fr: "en attente",
  },
  "în procesare": {
    en: "processing",
    fr: "en traitement",
  },
  "Continuă cu rezumatul generat": {
    en: "Continue with generated summary",
    fr: "Continuer avec le résumé généré",
  },
  "Așteaptă generarea pachetului": {
    en: "Wait for pack generation",
    fr: "Attendre la génération du pack",
  },
  "Pachetul proiectului este generat și poate fi folosit pentru studiu.": {
    en: "The project pack is generated and can be used for study.",
    fr: "Le pack du projet est généré et peut être utilisé pour étudier.",
  },
  "Reviss convertește materialele și salvează automat conținutul generat.": {
    en: "Reviss converts the materials and automatically saves the generated content.",
    fr: "Reviss convertit les supports et enregistre automatiquement le contenu généré.",
  },
  "Generarea quizurilor durează prea mult. Reîncarcă pagina.": {
    en: "Quiz generation is taking too long. Reload the page.",
    fr: "La génération des quiz prend trop de temps. Recharge la page.",
  },
  "Generarea nu a putut fi finalizată.": {
    en: "Generation could not be completed.",
    fr: "La génération n'a pas pu être terminée.",
  },
  "Generarea durează prea mult. Reîncarcă pagina în câteva minute.": {
    en: "Generation is taking too long. Reload the page in a few minutes.",
    fr: "La génération prend trop de temps. Recharge la page dans quelques minutes.",
  },
  "Proiectul nu a putut fi pregătit momentan.": {
    en: "The project could not be prepared right now.",
    fr: "Le projet n'a pas pu être préparé pour le moment.",
  },
  "Pregătire conținut": {
    en: "Preparing content",
    fr: "Préparation du contenu",
  },
  "Proiect": {
    en: "Project",
    fr: "Projet",
  },
  "Analizez flashcardul...": {
    en: "Analyzing the flashcard...",
    fr: "Analyse de la flashcard...",
  },
  "Anulare": {
    en: "Cancel",
    fr: "Annulation",
  },
  "Reia quiz-ul": {
    en: "Retake quiz",
    fr: "Refaire le quiz",
  },
  "Quizurile sunt create separat ca să nu consumăm AI înainte să ai rezumatul și flashcardurile pregătite.": {
    en: "Quizzes are created separately so we do not use AI before your summary and flashcards are ready.",
    fr: "Les quiz sont créés séparément pour ne pas utiliser l'IA avant que le résumé et les flashcards soient prêts.",
  },
  "Alege testul potrivit.": {
    en: "Choose the right test.",
    fr: "Choisis le bon test.",
  },
  "Pașii sunt generați din materialul proiectului și sunt gândiți pentru recapitulare activă, nu pentru citire pasivă.": {
    en: "The steps are generated from the project material and designed for active review, not passive reading.",
    fr: "Les étapes sont générées depuis le support du projet et pensées pour une révision active, pas une lecture passive.",
  },
  "20-30 min pe sesiune, apoi verificare rapidă în quiz-uri.": {
    en: "20-30 min per session, then quick quiz check.",
    fr: "20-30 min par session, puis vérification rapide en quiz.",
  },
  "Nu ai încă greșeli înregistrate la quiz-uri — răspunde la câteva întrebări ca să apară zonele de recapitulat aici.": {
    en: "You do not have recorded quiz mistakes yet — answer a few questions so review areas can appear here.",
    fr: "Tu n'as pas encore d'erreurs enregistrées aux quiz — réponds à quelques questions pour voir les zones à réviser ici.",
  },
  "Nu ai încă greșeli înregistrate la quiz-uri — răspunde la câteva întrebări pentru a apărea zonele de recapitulat aici.": {
    en: "You do not have recorded quiz mistakes yet — answer a few questions so review areas can appear here.",
    fr: "Tu n'as pas encore d'erreurs enregistrées aux quiz — réponds à quelques questions pour faire apparaître les zones à réviser ici.",
  },
  "Mergi la quiz-uri": {
    en: "Go to quizzes",
    fr: "Aller aux quiz",
  },
  "Rezolvă un quiz ca să vezi aici evoluția scorurilor tale în timp.": {
    en: "Complete a quiz to see your score evolution here over time.",
    fr: "Termine un quiz pour voir ici l'évolution de tes scores dans le temps.",
  },
  "Scor pe quiz": {
    en: "Score by quiz",
    fr: "Score par quiz",
  },
  "Quiz-urile nu sunt generate încă pentru acest proiect.": {
    en: "Quizzes have not been generated for this project yet.",
    fr: "Les quiz ne sont pas encore générés pour ce projet.",
  },
  "Se generează rezumatul, cuvintele cheie, strategiile și flashcardurile. Quizurile se pornesc separat din tabul dedicat.": {
    en: "The summary, keywords, strategies and flashcards are being generated. Quizzes are started separately from their dedicated tab.",
    fr: "Le résumé, les mots-clés, les stratégies et les flashcards sont en cours de génération. Les quiz se lancent séparément depuis leur onglet dédié.",
  },
  "Nu încărca date sensibile sau materiale pentru care nu ai drept de utilizare.": {
    en: "Do not upload sensitive data or materials you do not have the right to use.",
    fr: "N'importe pas de données sensibles ni de supports que tu n'as pas le droit d'utiliser.",
  },
  "Proiectul este pregătit pentru studiu. Quizurile se generează separat, din tabul Quiz-uri, când vrei să intri în testare.": {
    en: "The project is ready for study. Quizzes are generated separately from the Quizzes tab when you want to start testing.",
    fr: "Le projet est prêt pour l'étude. Les quiz sont générés séparément depuis l'onglet Quiz quand tu veux passer au test.",
  },
  "Verifică dacă ai selectat un fragment clar din rezumat.": {
    en: "Check that you selected a clear fragment from the summary.",
    fr: "Vérifie que tu as sélectionné un fragment clair du résumé.",
  },
  "Poți continua studiul și poți reveni la explicație mai târziu.": {
    en: "You can continue studying and return to the explanation later.",
    fr: "Tu peux continuer à étudier et revenir à l'explication plus tard.",
  },
  "Pachetul generat din materialele încărcate, bun pentru prima recapitulare structurată.": {
    en: "The pack generated from uploaded materials, useful for the first structured review.",
    fr: "Le pack généré depuis les supports importés, utile pour la première révision structurée.",
  },
  "din rezumatul inițial": {
    en: "from the initial summary",
    fr: "depuis le résumé initial",
  },
  "Descrierea planului apare aici.": {
    en: "The plan description appears here.",
    fr: "La description du forfait apparaît ici.",
  },
  "proiecte, materiale și generare": {
    en: "projects, materials and generation",
    fr: "projets, supports et génération",
  },
  "Informațiile de bază, planul curent și sumarul contului.": {
    en: "Basic information, current plan and account summary.",
    fr: "Informations de base, forfait actuel et résumé du compte.",
  },
  "Culorile aplicației.": {
    en: "Application colors.",
    fr: "Couleurs de l'application.",
  },
  "Alerte și emailuri.": {
    en: "Alerts and emails.",
    fr: "Alertes et e-mails.",
  },
  "Alege ce notificări primești în timpul studiului.": {
    en: "Choose which notifications you receive while studying.",
    fr: "Choisis les notifications que tu reçois pendant l'étude.",
  },
  "Setări pentru cont, sesiuni și acțiuni critice.": {
    en: "Settings for account, sessions and critical actions.",
    fr: "Paramètres du compte, des sessions et des actions critiques.",
  },
  "Confidențialitate": {
    en: "Privacy",
    fr: "Confidentialité",
  },
  "Ritm intens, cu quiz-uri mai dese și recapitulare activă.": {
    en: "Intense pace, with more frequent quizzes and active review.",
    fr: "Rythme intense, avec des quiz plus fréquents et une révision active.",
  },
  "Quiz după rezumat": {
    en: "Quiz after summary",
    fr: "Quiz après résumé",
  },
  "După fiecare rezumat, Reviss propune un quiz scurt.": {
    en: "After each summary, Reviss suggests a short quiz.",
    fr: "Après chaque résumé, Reviss propose un quiz court.",
  },
  "Confirmări, resetare parolă și rapoarte importante.": {
    en: "Confirmations, password reset and important reports.",
    fr: "Confirmations, réinitialisation du mot de passe et rapports importants.",
  },
  "Proiect generat": {
    en: "Generated project",
    fr: "Projet généré",
  },
  "Când rezumatul, flashcard-urile sau quiz-ul au fost generate.": {
    en: "When the summary, flashcards or quiz have been generated.",
    fr: "Quand le résumé, les flashcards ou le quiz ont été générés.",
  },
  "Facturi și abonament": {
    en: "Invoices and subscription",
    fr: "Factures et abonnement",
  },
  "Arhiva proiectelor nu a putut fi încărcată.": {
    en: "The project archive could not be loaded.",
    fr: "L'archive des projets n'a pas pu être chargée.",
  },
  "Proiectul a fost restabilit în lista proiectelor active.": {
    en: "The project was restored to the active projects list.",
    fr: "Le projet a été restauré dans la liste des projets actifs.",
  },
  "Proiectul nu a putut fi restabilit.": {
    en: "The project could not be restored.",
    fr: "Le projet n'a pas pu être restauré.",
  },
  "Proiectul arhivat a fost șters definitiv.": {
    en: "The archived project was permanently deleted.",
    fr: "Le projet archivé a été supprimé définitivement.",
  },
  "Limită materiale": {
    en: "Material limit",
    fr: "Limite de supports",
  },
  "Anulare abonament.": {
    en: "Subscription cancellation.",
    fr: "Annulation de l'abonnement.",
  },
  "Poți opri reînnoirea automată direct din cont, fără să trimiți e-mail. Accesul rămâne activ până la finalul perioadei deja plătite.": {
    en: "You can stop automatic renewal directly from your account, without sending an email. Access stays active until the end of the paid period.",
    fr: "Tu peux arrêter le renouvellement automatique directement depuis ton compte, sans envoyer d'e-mail. L'accès reste actif jusqu'à la fin de la période déjà payée.",
  },
  "Materialele și progresul rămân în cont.": {
    en: "Materials and progress stay in the account.",
    fr: "Les supports et la progression restent dans le compte.",
  },
  "Anularea nu a putut fi procesată.": {
    en: "Cancellation could not be processed.",
    fr: "L'annulation n'a pas pu être traitée.",
  },
  "Anulare reînnoire": {
    en: "Cancel renewal",
    fr: "Annuler le renouvellement",
  },
  "Studiu Activ": {
    en: "Active Study",
    fr: "Étude active",
  },
  "Plan gratuit inclus": {
    en: "Free plan included",
    fr: "Forfait gratuit inclus",
  },
  "Reînnoirea abonamentului este activă din nou.": {
    en: "Subscription renewal is active again.",
    fr: "Le renouvellement de l'abonnement est de nouveau actif.",
  },
  "Plan actual": {
    en: "Current plan",
    fr: "Forfait actuel",
  },
  "Perioadă abonament": {
    en: "Subscription period",
    fr: "Période d'abonnement",
  },
  "Anularea oprește următoarea reînnoire.": {
    en: "Cancellation stops the next renewal.",
    fr: "L'annulation arrête le prochain renouvellement.",
  },
  "Categorii de cookie-uri": {
    en: "Cookie categories",
    fr: "Catégories de cookies",
  },
  "Detalii despre datele personale prelucrate în Reviss, scopurile utilizării lor, drepturile utilizatorilor și măsurile de protecție aplicate.": {
    en: "Details about personal data processed in Reviss, the purposes of use, user rights and protection measures.",
    fr: "Détails sur les données personnelles traitées dans Reviss, les finalités, les droits des utilisateurs et les mesures de protection.",
  },
  "Raportează conținut incorect, conținut care include date personale sau posibile încălcări de drepturi.": {
    en: "Report incorrect content, content containing personal data or possible rights violations.",
    fr: "Signale du contenu incorrect, du contenu avec des données personnelles ou de possibles violations de droits.",
  },
  "Trimite detalii despre materialul sau conținutul generat care trebuie analizat de echipa Reviss.": {
    en: "Send details about the material or generated content that the Reviss team should review.",
    fr: "Envoie des détails sur le support ou le contenu généré que l'équipe Reviss doit analyser.",
  },
  "Retragere din contract.": {
    en: "Contract withdrawal.",
    fr: "Rétractation du contrat.",
  },
  "Configurează preferințele contului Reviss.": {
    en: "Configure your Reviss account preferences.",
    fr: "Configure les préférences de ton compte Reviss.",
  },
  "Termeni legali": {
    en: "Legal terms",
    fr: "Conditions légales",
  },
  "Regulile de utilizare ale platformei Reviss, drepturile și responsabilitățile aplicabile contului, materialelor încărcate și funcționalităților disponibile.": {
    en: "Rules for using the Reviss platform, rights and responsibilities related to the account, uploaded materials and available features.",
    fr: "Règles d'utilisation de la plateforme Reviss, droits et responsabilités liés au compte, aux supports importés et aux fonctionnalités disponibles.",
  },
  "Alege planul Reviss potrivit pentru studiul tău.": {
    en: "Choose the Reviss plan that fits your study.",
    fr: "Choisis le forfait Reviss adapté à ton étude.",
  },
  "Istoricul facturilor pentru abonamentul Reviss.": {
    en: "Invoice history for the Reviss subscription.",
    fr: "Historique des factures pour l'abonnement Reviss.",
  },
  "Chat AI contextual pentru proiectul tău Reviss.": {
    en: "Contextual AI Chat for your Reviss project.",
    fr: "Chat IA contextuel pour ton projet Reviss.",
  },
  "Flashcard-urile generate pentru proiectul tău Reviss.": {
    en: "Flashcards generated for your Reviss project.",
    fr: "Flashcards générées pour ton projet Reviss.",
  },
  "Progresul proiectului tău Reviss.": {
    en: "Your Reviss project progress.",
    fr: "Progression de ton projet Reviss.",
  },
  "Quiz-urile proiectului tău Reviss.": {
    en: "Quizzes for your Reviss project.",
    fr: "Quiz de ton projet Reviss.",
  },
  "Rezumatul complet al proiectului tău Reviss.": {
    en: "Complete summary of your Reviss project.",
    fr: "Résumé complet de ton projet Reviss.",
  },
  "Strategiile de învățare pentru proiectul tău Reviss.": {
    en: "Learning strategies for your Reviss project.",
    fr: "Stratégies d'apprentissage pour ton projet Reviss.",
  },
  "Creează manual flashcarduri pentru proiectul tău Reviss.": {
    en: "Manually create flashcards for your Reviss project.",
    fr: "Créer manuellement des flashcards pour ton projet Reviss.",
  },
  "Administrare utilizatori Reviss.": {
    en: "Reviss user administration.",
    fr: "Administration des utilisateurs Reviss.",
  },
  "Date administrative pentru utilizator.": {
    en: "Administrative user data.",
    fr: "Données administratives de l'utilisateur.",
  },
  "Sesiunea de plata nu a putut fi confirmata.": {
    en: "The payment session could not be confirmed.",
    fr: "La session de paiement n'a pas pu être confirmée.",
  },
  "Facturile nu au putut fi incarcate.": {
    en: "Invoices could not be loaded.",
    fr: "Les factures n'ont pas pu être chargées.",
  },
  "A apărut o eroare la proiect. Te rugăm să încerci din nou.": {
    en: "A project error occurred. Please try again.",
    fr: "Une erreur de projet est survenue. Réessaie.",
  },
  "Serviciul de proiecte nu este disponibil.": {
    en: "The project service is not available.",
    fr: "Le service de projets n'est pas disponible.",
  },
  "Ruta pentru proiecte nu exista.": {
    en: "The project route does not exist.",
    fr: "La route des projets n'existe pas.",
  },
  "Flashcard-uri și quiz-uri de bază": {
    en: "Basic flashcards and quizzes",
    fr: "Flashcards et quiz de base",
  },
  "Rezumat generat pentru fiecare material": {
    en: "Summary generated for each material",
    fr: "Résumé généré pour chaque support",
  },
  "Acces la progresul general": {
    en: "Access to general progress",
    fr: "Accès à la progression générale",
  },
  "Istoric complet pe proiecte": {
    en: "Complete project history",
    fr: "Historique complet par projet",
  },
  "Analiză de progres pe fiecare proiect": {
    en: "Progress analysis for every project",
    fr: "Analyse de progression pour chaque projet",
  },
  "Chat AI contextual pe proiect": {
    en: "Contextual AI Chat per project",
    fr: "Chat IA contextuel par projet",
  },
  "Planuri AI pentru examene": {
    en: "AI plans for exams",
    fr: "Plans IA pour examens",
  },
  "Planuri de învățare pe data examenului": {
    en: "Learning plans by exam date",
    fr: "Plans d'apprentissage selon la date d'examen",
  },
  "Fundalul meniului din zona de cont.": {
    en: "The menu background in the account area.",
    fr: "L'arrière-plan du menu dans la zone du compte.",
  },
  "Mesaje pozitive și indicatori de progres.": {
    en: "Positive messages and progress indicators.",
    fr: "Messages positifs et indicateurs de progression.",
  },
  "Neutru, ca un editor de cod, cu contrast mai clar.": {
    en: "Neutral, like a code editor, with clearer contrast.",
    fr: "Neutre, comme un éditeur de code, avec un contraste plus clair.",
  },
  "Biologie celulară": {
    en: "Cellular biology",
    fr: "Biologie cellulaire",
  },
  "28 pagini": {
    en: "28 pages",
    fr: "28 pages",
  },
  "25 min": {
    en: "25 min",
    fr: "25 min",
  },
  "Quiz-uri cu feedback": {
    en: "Quizzes with feedback",
    fr: "Quiz avec retour",
  },
  "doar cu acord": {
    en: "only with consent",
    fr: "uniquement avec accord",
  },
  "Marcate": {
    en: "Marked",
    fr: "Marquées",
  },
  "Flashcard AI": {
    en: "AI flashcard",
    fr: "Flashcard IA",
  },
  "Caut conceptul, legătura cu răspunsul și cea mai scurtă explicație utilă pentru recapitulare.": {
    en: "I look for the concept, its link to the answer and the shortest useful explanation for review.",
    fr: "Je cherche le concept, son lien avec la réponse et l'explication la plus utile pour réviser.",
  },
  "Cum să-l înveți": {
    en: "How to learn it",
    fr: "Comment l'apprendre",
  },
  "Flashcard manual": {
    en: "Manual flashcard",
    fr: "Flashcard manuelle",
  },
  "Quiz activ": {
    en: "Active quiz",
    fr: "Quiz actif",
  },
  "răspunse": {
    en: "answered",
    fr: "répondues",
  },
  "Recomandare AI": {
    en: "AI recommendation",
    fr: "Recommandation IA",
  },
  "Istoric": {
    en: "History",
    fr: "Historique",
  },
  "Quiz finalizat": {
    en: "Quiz completed",
    fr: "Quiz terminé",
  },
  "Vezi sumarul": {
    en: "View summary",
    fr: "Voir le résumé",
  },
  "Sumar final": {
    en: "Final summary",
    fr: "Résumé final",
  },
  "Recapitulare, aplicare și simulare de examen, separate ca să știi exact ce exersezi.": {
    en: "Review, application and exam simulation, separated so you know exactly what you are practicing.",
    fr: "Révision, application et simulation d'examen, séparées pour savoir exactement quoi travailler.",
  },
  "Strategii AI": {
    en: "AI strategies",
    fr: "Stratégies IA",
  },
  "Context": {
    en: "Context",
    fr: "Contexte",
  },
  "Ritm recomandat": {
    en: "Recommended pace",
    fr: "Rythme recommandé",
  },
  "Bază": {
    en: "Foundation",
    fr: "Base",
  },
  "Valabile pentru orice materie.": {
    en: "Useful for any subject.",
    fr: "Valables pour toute matière.",
  },
  "Bune de folosit la orice curs.": {
    en: "Useful for any course.",
    fr: "Utiles pour n'importe quel cours.",
  },
  "Închide cursul și încearcă să răspunzi": {
    en: "Close the course and try to answer",
    fr: "Ferme le cours et essaie de répondre",
  },
  "După fiecare secțiune, spune pe scurt ideea principală fără să te uiți în material.": {
    en: "After each section, briefly say the main idea without looking at the material.",
    fr: "Après chaque section, reformule brièvement l'idée principale sans regarder le support.",
  },
  "Revino mâine peste ideile importante": {
    en: "Review the important ideas tomorrow",
    fr: "Reviens demain sur les idées importantes",
  },
  "O recapitulare scurtă după o zi te ajută să fixezi conceptele care altfel se uită repede.": {
    en: "A short review after one day helps you keep concepts that would otherwise fade quickly.",
    fr: "Une courte révision après une journée t'aide à fixer les concepts qui s'oublient vite.",
  },
  "Explică simplu, cu exemple": {
    en: "Explain simply, with examples",
    fr: "Explique simplement, avec des exemples",
  },
  "Dacă poți lega teoria de un exemplu concret, ai șanse mult mai mari să o reții la examen.": {
    en: "If you can connect the theory to a concrete example, you are much more likely to remember it in the exam.",
    fr: "Si tu peux relier la théorie à un exemple concret, tu as beaucoup plus de chances de la retenir à l'examen.",
  },
  "Rata de completare": {
    en: "Completion rate",
    fr: "Taux de complétion",
  },
  "Greșești frecvent la:": {
    en: "You often miss:",
    fr: "Tu te trompes souvent sur :",
  },
  "Vezi planuri": {
    en: "View plans",
    fr: "Voir les plans",
  },
  "← Setări admin": {
    en: "← Admin settings",
    fr: "← Paramètres admin",
  },
  "← Utilizatori": {
    en: "← Users",
    fr: "← Utilisateurs",
  },
  "Audit": {
    en: "Audit",
    fr: "Audit",
  },
  "Jurnal activitate.": {
    en: "Activity log.",
    fr: "Journal d'activité.",
  },
  "Actor": {
    en: "Actor",
    fr: "Acteur",
  },
  "Detalii": {
    en: "Details",
    fr: "Détails",
  },
  "Vezi detalii": {
    en: "View details",
    fr: "Voir les détails",
  },
  "Document legal": {
    en: "Legal document",
    fr: "Document légal",
  },
  "Vezi public": {
    en: "View public page",
    fr: "Voir la page publique",
  },
  "Variabile": {
    en: "Variables",
    fr: "Variables",
  },
  "Variabile legale": {
    en: "Legal variables",
    fr: "Variables légales",
  },
  "Preview footer": {
    en: "Footer preview",
    fr: "Aperçu du footer",
  },
  "Publicare": {
    en: "Publishing",
    fr: "Publication",
  },
  "Abonamente": {
    en: "Subscriptions",
    fr: "Abonnements",
  },
  "Administrare planuri.": {
    en: "Plan administration.",
    fr: "Administration des plans.",
  },
  "recomandat": {
    en: "recommended",
    fr: "recommandé",
  },
  "Deschide": {
    en: "Open",
    fr: "Ouvrir",
  },
  "Administrare": {
    en: "Administration",
    fr: "Administration",
  },
  "Acces admin": {
    en: "Admin access",
    fr: "Accès admin",
  },
  "Utilizator": {
    en: "User",
    fr: "Utilisateur",
  },
  "Sesiuni": {
    en: "Sessions",
    fr: "Sessions",
  },
  "User agent": {
    en: "User agent",
    fr: "User agent",
  },
  "Email": {
    en: "Email",
    fr: "Email",
  },
  "Rol": {
    en: "Role",
    fr: "Rôle",
  },
  "Creat": {
    en: "Created",
    fr: "Créé",
  },
  "Ultima sesiune": {
    en: "Last session",
    fr: "Dernière session",
  },
  "Valoare": {
    en: "Amount",
    fr: "Montant",
  },
  "Termenii și Condițiile": {
    en: "Terms and Conditions",
    fr: "Conditions générales",
  },
  ". Informații despre retragere sunt în politica de contract.": {
    en: ". Withdrawal information is available in the contract withdrawal policy.",
    fr: ". Les informations sur le retrait sont disponibles dans la politique de retrait du contrat.",
  },
  "Ritmul curent": {
    en: "Current pace",
    fr: "Rythme actuel",
  },
  "Azi": {
    en: "Today",
    fr: "Aujourd'hui",
  },
  "Tema curentă": {
    en: "Current theme",
    fr: "Thème actuel",
  },
  "Schimbă": {
    en: "Change",
    fr: "Changer",
  },
  "Solicită": {
    en: "Request",
    fr: "Demander",
  },
  "Secțiune:": {
    en: "Section:",
    fr: "Section :",
  },
  "Ce se întâmplă după anulare": {
    en: "What happens after cancellation",
    fr: "Ce qui se passe après l'annulation",
  },
  "Nu vei mai fi taxat la următoarea dată de facturare.": {
    en: "You will not be charged at the next billing date.",
    fr: "Tu ne seras plus facturé à la prochaine date de facturation.",
  },
  "Poți reactiva un plan oricând din pagina Abonament.": {
    en: "You can reactivate a plan anytime from the Subscription page.",
    fr: "Tu peux réactiver un plan à tout moment depuis la page Abonnement.",
  },
  "Înainte": {
    en: "Previous",
    fr: "Précédent",
  },
  "Activ": {
    en: "Active",
    fr: "Actif",
  },
  "Informații înainte de plată": {
    en: "Information before payment",
    fr: "Informations avant paiement",
  },
  "Plan": {
    en: "Plan",
    fr: "Plan",
  },
  "Preț total": {
    en: "Total price",
    fr: "Prix total",
  },
  "Monedă": {
    en: "Currency",
    fr: "Devise",
  },
  "TVA": {
    en: "VAT",
    fr: "TVA",
  },
  "Inclus, dacă este aplicabil": {
    en: "Included, if applicable",
    fr: "Incluse, si applicable",
  },
  "Frecvența plății": {
    en: "Payment frequency",
    fr: "Fréquence de paiement",
  },
  "Intrare în vigoare": {
    en: "Effective date",
    fr: "Entrée en vigueur",
  },
  "Capital social": {
    en: "Share capital",
    fr: "Capital social",
  },
  "Linkuri juridice": {
    en: "Legal links",
    fr: "Liens juridiques",
  },
  "Flashcard-uri active": {
    en: "Active flashcards",
    fr: "Flashcards actives",
  },
  "Din curs direct în memorie.": {
    en: "From course straight into memory.",
    fr: "Du cours directement à la mémoire.",
  },
  "Flashcard-uri care țin pasul cu tine": {
    en: "Flashcards that keep pace with you",
    fr: "Des flashcards qui suivent ton rythme",
  },
  "Nu doar citești. Îți testezi memoria.": {
    en: "You do not just read. You test your memory.",
    fr: "Tu ne lis pas seulement. Tu testes ta mémoire.",
  },
  "Încarci cursul, iar Reviss extrage ideile-cheie și le transformă în flashcard-uri.": {
    en: "Upload the course and Reviss extracts the key ideas into flashcards.",
    fr: "Importe le cours et Reviss transforme les idées clés en flashcards.",
  },
  "Meniu principal": {
    en: "Main menu",
    fr: "Menu principal",
  },
  "Ascunde meniul": {
    en: "Hide menu",
    fr: "Masquer le menu",
  },
  "Afișează meniul": {
    en: "Show menu",
    fr: "Afficher le menu",
  },
  "Flashcard anterior": {
    en: "Previous flashcard",
    fr: "Flashcard précédente",
  },
  "Flashcard următor": {
    en: "Next flashcard",
    fr: "Flashcard suivante",
  },
  "din greșeli reale": {
    en: "from real mistakes",
    fr: "depuis les vraies erreurs",
  },
  "Create manual": {
    en: "Create manually",
    fr: "Créer manuellement",
  },
  "create manual": {
    en: "create manually",
    fr: "créer manuellement",
  },
  "Cardurile adăugate manual, separate de pachetele generate automat.": {
    en: "Manually added cards, separated from automatically generated decks.",
    fr: "Cartes ajoutées manuellement, séparées des paquets générés automatiquement.",
  },
  "Corecte": {
    en: "Correct",
    fr: "Correctes",
  },
  "Concepte slabe": {
    en: "Weak concepts",
    fr: "Concepts faibles",
  },
  "Închide sumarul": {
    en: "Close summary",
    fr: "Fermer le résumé",
  },
  "Scor quiz": {
    en: "Quiz score",
    fr: "Score du quiz",
  },
  "Flashcard-uri sugerate": {
    en: "Suggested flashcards",
    fr: "Flashcards suggérées",
  },
  "Timp recomandat": {
    en: "Recommended time",
    fr: "Temps recommandé",
  },
  "Tip": {
    en: "Type",
    fr: "Type",
  },
  "Rezultat": {
    en: "Result",
    fr: "Résultat",
  },
  "Scor mediu": {
    en: "Average score",
    fr: "Score moyen",
  },
  "Quiz-uri completate": {
    en: "Completed quizzes",
    fr: "Quiz terminés",
  },
  "Ultimul scor": {
    en: "Last score",
    fr: "Dernier score",
  },
  "Material activ": {
    en: "Active material",
    fr: "Support actif",
  },
  "Recapitulare scurtă după fiecare răspuns greșit": {
    en: "Short review after every wrong answer",
    fr: "Révision courte après chaque mauvaise réponse",
  },
  "Flashcard-uri generate": {
    en: "Generated flashcards",
    fr: "Flashcards générées",
  },
  "Flashcard-uri manuale": {
    en: "Manual flashcards",
    fr: "Flashcards manuelles",
  },
  "Concepte cheie": {
    en: "Key concepts",
    fr: "Concepts clés",
  },
  "Evoluția scorurilor la quiz-uri în timp": {
    en: "Quiz score evolution over time",
    fr: "Évolution des scores de quiz dans le temps",
  },
  "Materiale": {
    en: "Materials",
    fr: "Supports",
  },
  "Drepturi": {
    en: "Rights",
    fr: "Droits",
  },
  "Ex: Farma sem. 2": {
    en: "Ex: Pharma sem. 2",
    fr: "Ex : Pharma sem. 2",
  },
  "Ex: Imunologie": {
    en: "Ex: Immunology",
    fr: "Ex : Immunologie",
  },
  "Ex: UMF / UTCN": {
    en: "Ex: UMF / UTCN",
    fr: "Ex : UMF / UTCN",
  },
  "Învățare": {
    en: "Learning",
    fr: "Apprentissage",
  },
  "Cum vrei să lucreze Reviss.": {
    en: "How you want Reviss to work.",
    fr: "Comment tu veux que Reviss travaille.",
  },
  "Preferințe pentru ritmul de studiu și feedback-ul AI.": {
    en: "Preferences for study pace and AI feedback.",
    fr: "Préférences pour le rythme d'étude et le retour IA.",
  },
  "Light, dark sau system, separat de paleta de culori.": {
    en: "Light, dark or system, separate from the color palette.",
    fr: "Clair, sombre ou système, séparé de la palette de couleurs.",
  },
  "Editor temă": {
    en: "Theme editor",
    fr: "Éditeur de thème",
  },
  "Preset-uri ca într-un editor de cod și override-uri fine.": {
    en: "Presets like in a code editor, plus fine overrides.",
    fr: "Préréglages comme dans un éditeur de code, avec ajustements fins.",
  },
  "Sesiuni și protecție.": {
    en: "Sessions and protection.",
    fr: "Sessions et protection.",
  },
  "Interfața principală pentru studenții din România.": {
    en: "The main interface for students in Romania.",
    fr: "L'interface principale pour les étudiants en Roumanie.",
  },
  "Pentru studenții francofoni.": {
    en: "For French-speaking students.",
    fr: "Pour les étudiants francophones.",
  },
  "Interfață clară pentru studiu ziua.": {
    en: "Clear interface for daytime study.",
    fr: "Interface claire pour étudier le jour.",
  },
  "Contrast calm pentru sesiuni seara.": {
    en: "Calm contrast for evening sessions.",
    fr: "Contraste doux pour les sessions du soir.",
  },
  "Urmează preferința dispozitivului.": {
    en: "Follows your device preference.",
    fr: "Suit la préférence de ton appareil.",
  },
  "Flexibil": {
    en: "Flexible",
    fr: "Flexible",
  },
  "Pentru zile încărcate, cu recapitulare minimă.": {
    en: "For busy days, with minimal review.",
    fr: "Pour les journées chargées, avec une révision minimale.",
  },
  "Structurat": {
    en: "Structured",
    fr: "Structuré",
  },
  "Echilibrat": {
    en: "Balanced",
    fr: "Équilibré",
  },
  "Sesiuni scurte, dar constante, pentru progres zilnic.": {
    en: "Short but consistent sessions for daily progress.",
    fr: "Sessions courtes mais régulières pour progresser chaque jour.",
  },
  "Intensiv": {
    en: "Intensive",
    fr: "Intensif",
  },
  "Examen": {
    en: "Exam",
    fr: "Examen",
  },
  "Concis": {
    en: "Concise",
    fr: "Concis",
  },
  "Răspunsuri scurte, bune când repeți rapid.": {
    en: "Short answers, useful when reviewing quickly.",
    fr: "Réponses courtes, utiles pour réviser rapidement.",
  },
  "Ghidat": {
    en: "Guided",
    fr: "Guidé",
  },
  "Ghidate": {
    en: "Guided",
    fr: "Guidées",
  },
  "Explicații pas cu pas, cu exemple simple.": {
    en: "Step-by-step explanations with simple examples.",
    fr: "Explications étape par étape avec des exemples simples.",
  },
  "Stil examen": {
    en: "Exam style",
    fr: "Style examen",
  },
  "Feedback orientat pe formulări și capcane de test.": {
    en: "Feedback focused on wording and test traps.",
    fr: "Retour centré sur les formulations et les pièges de test.",
  },
  "Recapitulare zilnică": {
    en: "Daily review",
    fr: "Révision quotidienne",
  },
  "Primești recomandarea de 5-20 minute pentru azi.": {
    en: "You receive today's 5-20 minute recommendation.",
    fr: "Tu reçois la recommandation de 5 à 20 minutes pour aujourd'hui.",
  },
  "Alerte concepte slabe": {
    en: "Weak concept alerts",
    fr: "Alertes concepts faibles",
  },
  "Apar când un concept riscă să fie uitat.": {
    en: "Shown when a concept is at risk of being forgotten.",
    fr: "Affichées lorsqu'un concept risque d'être oublié.",
  },
  "Progres săptămânal": {
    en: "Weekly progress",
    fr: "Progrès hebdomadaire",
  },
  "Primești un rezumat cu statistici în fiecare luni.": {
    en: "You get a summary with stats every Monday.",
    fr: "Tu reçois un résumé avec des statistiques chaque lundi.",
  },
  "Reminder inactivitate": {
    en: "Inactivity reminder",
    fr: "Rappel d'inactivité",
  },
  "Un mesaj de revenire dacă nu mai studiezi de câteva zile.": {
    en: "A nudge to come back if you haven't studied in a few days.",
    fr: "Un message de retour si tu n'as pas étudié depuis quelques jours.",
  },
  "Statistici despre studiul tău din ultima săptămână. Aceeași setare ca „Progres săptămânal” din tab-ul Studiu.": {
    en: "Stats about your studying from the past week. Same setting as \"Weekly progress\" in the Study tab.",
    fr: "Statistiques sur ton étude de la semaine passée. Même réglage que « Progrès hebdomadaire » dans l'onglet Étude.",
  },
  "Când nu mai studiezi de câteva zile. Aceeași setare ca „Reminder inactivitate” din tab-ul Studiu.": {
    en: "When you haven't studied in a few days. Same setting as \"Inactivity reminder\" in the Study tab.",
    fr: "Quand tu n'as pas étudié depuis quelques jours. Même réglage que « Rappel d'inactivité » dans l'onglet Étude.",
  },
  "Streak și realizări": {
    en: "Streaks and achievements",
    fr: "Séries et réussites",
  },
  "Când atingi un număr de zile consecutive de studiu.": {
    en: "When you hit a number of consecutive study days.",
    fr: "Quand tu atteins un nombre de jours d'étude consécutifs.",
  },
  "Reminder studiu": {
    en: "Study reminder",
    fr: "Rappel d'étude",
  },
  "Alerte blânde pentru recapitularea zilnică.": {
    en: "Gentle alerts for daily review.",
    fr: "Alertes douces pour la révision quotidienne.",
  },
  "Noutăți produs": {
    en: "Product updates",
    fr: "Nouveautés produit",
  },
  "Funcționalități noi și schimbări relevante în aplicație.": {
    en: "New features and relevant app changes.",
    fr: "Nouvelles fonctionnalités et changements importants dans l'application.",
  },
  "Concepte de repetat": {
    en: "Concepts to review",
    fr: "Concepts à revoir",
  },
  "Când Reviss observă zone care scad la retenție.": {
    en: "When Reviss detects areas with decreasing retention.",
    fr: "Quand Reviss détecte des zones où la rétention baisse.",
  },
  "Plăți, facturi noi și schimbări de plan.": {
    en: "Payments, new invoices and plan changes.",
    fr: "Paiements, nouvelles factures et changements de plan.",
  },
  "Membru din": {
    en: "Member since",
    fr: "Membre depuis",
  },
  "Protecție date": {
    en: "Data protection",
    fr: "Protection des données",
  },
  "Sesiune autentificată și date protejate": {
    en: "Authenticated session and protected data",
    fr: "Session authentifiée et données protégées",
  },
  "Feedback AI": {
    en: "AI feedback",
    fr: "Retour IA",
  },
  "Automatizări": {
    en: "Automations",
    fr: "Automatisations",
  },
  "Mod activ": {
    en: "Active mode",
    fr: "Mode actif",
  },
  "Paletă": {
    en: "Palette",
    fr: "Palette",
  },
  "Sincronizare": {
    en: "Sync",
    fr: "Synchronisation",
  },
  "Se aplică automat după autentificare": {
    en: "Applies automatically after login",
    fr: "S'applique automatiquement après connexion",
  },
  "Mod afișare": {
    en: "Display mode",
    fr: "Mode d'affichage",
  },
  "Preseturi": {
    en: "Presets",
    fr: "Préréglages",
  },
  "Editor culori": {
    en: "Color editor",
    fr: "Éditeur de couleurs",
  },
  "Modificările suprascriu paleta selectată.": {
    en: "Changes override the selected palette.",
    fr: "Les modifications remplacent la palette sélectionnée.",
  },
  "Frecvență": {
    en: "Frequency",
    fr: "Fréquence",
  },
  "Cum primești notificările importante": {
    en: "How you receive important notifications",
    fr: "Comment tu reçois les notifications importantes",
  },
  "Canale active": {
    en: "Active channels",
    fr: "Canaux actifs",
  },
  "Email, studiu și noutăți produs": {
    en: "Email, study and product updates",
    fr: "Email, étude et nouveautés produit",
  },
  "Evenimente": {
    en: "Events",
    fr: "Événements",
  },
  "Tipuri de alerte permise": {
    en: "Allowed alert types",
    fr: "Types d'alertes autorisés",
  },
  "Livrare": {
    en: "Delivery",
    fr: "Livraison",
  },
  "Instant": {
    en: "Instant",
    fr: "Instantané",
  },
  "Primești alertele imediat ce apar.": {
    en: "You receive alerts as soon as they appear.",
    fr: "Tu reçois les alertes dès qu'elles apparaissent.",
  },
  "Rezumat zilnic": {
    en: "Daily digest",
    fr: "Résumé quotidien",
  },
  "Canale": {
    en: "Channels",
    fr: "Canaux",
  },
  "Închide arhiva": {
    en: "Close archive",
    fr: "Fermer l'archive",
  },
  "pornit": {
    en: "on",
    fr: "activé",
  },
  "oprit": {
    en: "off",
    fr: "désactivé",
  },
  "Toate": {
    en: "All",
    fr: "Tous",
  },
  "Erori": {
    en: "Errors",
    fr: "Erreurs",
  },
  "Ultimul log": {
    en: "Latest log",
    fr: "Dernier log",
  },
  "Caută după actor, acțiune, resursă sau IP...": {
    en: "Search by actor, action, resource or IP...",
    fr: "Rechercher par acteur, action, ressource ou IP...",
  },
  "Canale publice pentru suport și confidențialitate.": {
    en: "Public channels for support and privacy.",
    fr: "Canaux publics pour le support et la confidentialité.",
  },
  "E-mail confidențialitate": {
    en: "Privacy email",
    fr: "Email confidentialité",
  },
  "Furnizori": {
    en: "Providers",
    fr: "Fournisseurs",
  },
  "Nume afișate în politica publică.": {
    en: "Names displayed in the public policy.",
    fr: "Noms affichés dans la politique publique.",
  },
  "Furnizor AI": {
    en: "AI provider",
    fr: "Fournisseur IA",
  },
  "Serviciu de generare": {
    en: "Generation service",
    fr: "Service de génération",
  },
  "Furnizor plăți": {
    en: "Payment provider",
    fr: "Fournisseur de paiement",
  },
  "Furnizor hosting": {
    en: "Hosting provider",
    fr: "Fournisseur d'hébergement",
  },
  "Identitate": {
    en: "Identity",
    fr: "Identité",
  },
  "Firmă": {
    en: "Company",
    fr: "Entreprise",
  },
  "Registru": {
    en: "Registry",
    fr: "Registre",
  },
  "Sediu": {
    en: "Headquarters",
    fr: "Siège",
  },
  "Secțiuni": {
    en: "Sections",
    fr: "Sections",
  },
  "salvare individuală": {
    en: "individual saving",
    fr: "enregistrement individuel",
  },
  "cuvinte aproximative": {
    en: "approximate words",
    fr: "mots approximatifs",
  },
  "Ultima modificare": {
    en: "Last modified",
    fr: "Dernière modification",
  },
  "sincronizat cu pagina publică": {
    en: "synced with the public page",
    fr: "synchronisé avec la page publique",
  },
  "afișat ca alegere principală": {
    en: "shown as the main choice",
    fr: "affiché comme choix principal",
  },
  "cu Price ID configurat": {
    en: "with configured Price ID",
    fr: "avec Price ID configuré",
  },
  "Editor plan": {
    en: "Plan editor",
    fr: "Éditeur de plan",
  },
  "Nume plan": {
    en: "Plan name",
    fr: "Nom du plan",
  },
  "Slug intern": {
    en: "Internal slug",
    fr: "Slug interne",
  },
  "Preț lunar": {
    en: "Monthly price",
    fr: "Prix mensuel",
  },
  "Preț vechi / comparație": {
    en: "Old price / comparison",
    fr: "Ancien prix / comparaison",
  },
  "Reducere afișată": {
    en: "Displayed discount",
    fr: "Réduction affichée",
  },
  "Interval facturare": {
    en: "Billing interval",
    fr: "Intervalle de facturation",
  },
  "lunar": {
    en: "monthly",
    fr: "mensuel",
  },
  "Badge": {
    en: "Badge",
    fr: "Badge",
  },
  "Nivel AI": {
    en: "AI level",
    fr: "Niveau IA",
  },
  "Stocare / istoric": {
    en: "Storage / history",
    fr: "Stockage / historique",
  },
  "Ex: Limite lunare, utilizare individuală, condiții de generare.": {
    en: "Ex: Monthly limits, individual use, generation conditions.",
    fr: "Ex : limites mensuelles, usage individuel, conditions de génération.",
  },
  "Limite": {
    en: "Limits",
    fr: "Limites",
  },
  "Materiale / lună": {
    en: "Materials / month",
    fr: "Supports / mois",
  },
  "MB / fișier": {
    en: "MB / file",
    fr: "Mo / fichier",
  },
  "Pagini estimate": {
    en: "Estimated pages",
    fr: "Pages estimées",
  },
  "Flashcarduri inițiale": {
    en: "Initial flashcards",
    fr: "Flashcards initiales",
  },
  "Documente scanate / OCR": {
    en: "Scanned documents / OCR",
    fr: "Documents scannés / OCR",
  },
  "Permite încărcarea PDF-urilor fără text extractibil. Recomandat doar pentru planurile superioare.": {
    en: "Allows uploading PDFs without extractable text. Recommended only for higher plans.",
    fr: "Permet d'importer des PDF sans texte extractible. Recommandé seulement pour les plans supérieurs.",
  },
  "produs și preț checkout": {
    en: "product and checkout price",
    fr: "produit et prix checkout",
  },
  "stare în aplicație": {
    en: "app state",
    fr: "état dans l'application",
  },
  "Apare în homepage, upgrade și checkout.": {
    en: "Shown on homepage, upgrade and checkout.",
    fr: "Affiché sur la page d'accueil, upgrade et checkout.",
  },
  "Marchează ca recomandat": {
    en: "Mark as recommended",
    fr: "Marquer comme recommandé",
  },
  "Doar un plan poate fi recomandat simultan.": {
    en: "Only one plan can be recommended at a time.",
    fr: "Un seul plan peut être recommandé à la fois.",
  },
  "Opțiuni incluse": {
    en: "Included options",
    fr: "Options incluses",
  },
  "beneficii afișate public": {
    en: "publicly displayed benefits",
    fr: "avantages affichés publiquement",
  },
  "Șterge opțiunea": {
    en: "Delete option",
    fr: "Supprimer l'option",
  },
  "Conținut global și date juridice.": {
    en: "Global content and legal data.",
    fr: "Contenu global et données juridiques.",
  },
  "Configurație comercială.": {
    en: "Commercial configuration.",
    fr: "Configuration commerciale.",
  },
  "Utilizatori și acces": {
    en: "Users and access",
    fr: "Utilisateurs et accès",
  },
  "Conturi și permisiuni.": {
    en: "Accounts and permissions.",
    fr: "Comptes et permissions.",
  },
  "Monitorizare": {
    en: "Monitoring",
    fr: "Surveillance",
  },
  "Audit și diagnostic.": {
    en: "Audit and diagnostics.",
    fr: "Audit et diagnostic.",
  },
  "Zone globale": {
    en: "Global areas",
    fr: "Zones globales",
  },
  "Jurnal platformă": {
    en: "Platform log",
    fr: "Journal de plateforme",
  },
  "permisiune curentă": {
    en: "current permission",
    fr: "permission actuelle",
  },
  "Sesiuni active": {
    en: "Active sessions",
    fr: "Sessions actives",
  },
  "Ultima activitate": {
    en: "Last activity",
    fr: "Dernière activité",
  },
  "Tema preferată": {
    en: "Preferred theme",
    fr: "Thème préféré",
  },
  "Creat la": {
    en: "Created at",
    fr: "Créé le",
  },
  "Actualizat la": {
    en: "Updated at",
    fr: "Mis à jour le",
  },
  "Legal și consimțăminte": {
    en: "Legal and consents",
    fr: "Juridique et consentements",
  },
  "Versiune termeni": {
    en: "Terms version",
    fr: "Version des conditions",
  },
  "Newsletter": {
    en: "Newsletter",
    fr: "Newsletter",
  },
  "Newsletter acceptat la": {
    en: "Newsletter accepted at",
    fr: "Newsletter accepté le",
  },
  "Sesiuni totale": {
    en: "Total sessions",
    fr: "Sessions totales",
  },
  "sesiuni": {
    en: "sessions",
    fr: "sessions",
  },
  "Toți": {
    en: "All",
    fr: "Tous",
  },
  "Admini": {
    en: "Admins",
    fr: "Admins",
  },
  "Activi": {
    en: "Active",
    fr: "Actifs",
  },
  "Inactivi": {
    en: "Inactive",
    fr: "Inactifs",
  },
  "Conturi": {
    en: "Accounts",
    fr: "Comptes",
  },
  "Administratori": {
    en: "Administrators",
    fr: "Administrateurs",
  },
  "cu acces extins": {
    en: "with extended access",
    fr: "avec accès étendu",
  },
  "în acest moment": {
    en: "right now",
    fr: "en ce moment",
  },
  "utilizatori": {
    en: "users",
    fr: "utilisateurs",
  },
  "înregistrări": {
    en: "records",
    fr: "enregistrements",
  },
  "Preț": {
    en: "Price",
    fr: "Prix",
  },
  "Următoarea dată de facturare": {
    en: "Next billing date",
    fr: "Prochaine date de facturation",
  },
  "Reînnoire automată": {
    en: "Automatic renewal",
    fr: "Renouvellement automatique",
  },
  "Navigatie principala": {
    en: "Main navigation",
    fr: "Navigation principale",
  },
  "Navigatie mobila": {
    en: "Mobile navigation",
    fr: "Navigation mobile",
  },
  "custom": {
    en: "custom",
    fr: "personnalisé",
  },
  ". După această dată, planul revine la Beginner dacă nu reactivezi abonamentul.": {
    en: ". After this date, the plan returns to Beginner if you do not reactivate the subscription.",
    fr: ". Après cette date, le plan revient à Beginner si tu ne réactives pas l'abonnement.",
  },
  "Gata de studiu": {
    en: "Ready to study",
    fr: "Prêt à étudier",
  },
  "Concepte": {
    en: "Concepts",
    fr: "Concepts",
  },
  "Pentru facultate, sesiune și examene": {
    en: "For university, finals and exams",
    fr: "Pour l'université, les sessions et examens",
  },
  "Când cursurile se adună, Reviss le transformă în pași clari.": {
    en: "When courses pile up, Reviss turns them into clear steps.",
    fr: "Quand les cours s'accumulent, Reviss les transforme en étapes claires.",
  },
  "Folosește Reviss când ai nevoie de rezumate AI din PDF-uri, flashcard-uri pentru repetare, quiz-uri personalizate și un mod mai simplu de a pregăti examenele la facultate.": {
    en: "Use Reviss when you need AI summaries from PDFs, flashcards for review, personalized quizzes and a simpler way to prepare for university exams.",
    fr: "Utilise Reviss quand tu as besoin de résumés IA depuis des PDF, de flashcards pour réviser, de quiz personnalisés et d'une façon plus simple de préparer les examens universitaires.",
  },
  "Rezumate AI din PDF-uri și cursuri": {
    en: "AI summaries from PDFs and courses",
    fr: "Résumés IA depuis PDF et cours",
  },
  "Încarci suporturi de curs, documente Word, prezentări sau notițe, iar Reviss le transformă într-un rezumat structurat pentru recapitulare rapidă.": {
    en: "Upload course materials, Word documents, presentations or notes, and Reviss turns them into a structured summary for quick review.",
    fr: "Importe des supports de cours, documents Word, présentations ou notes, et Reviss les transforme en résumé structuré pour une révision rapide.",
  },
  "Flashcard-uri pentru învățare activă": {
    en: "Flashcards for active learning",
    fr: "Flashcards pour l'apprentissage actif",
  },
  "Conceptele importante devin carduri de repetat, astfel încât să verifici ce știi deja și ce trebuie reluat înainte de examen.": {
    en: "Important concepts become review cards, so you can check what you already know and what needs another pass before the exam.",
    fr: "Les concepts importants deviennent des cartes à répéter, pour vérifier ce que tu sais déjà et ce qu'il faut revoir avant l'examen.",
  },
  "Quiz-uri personalizate pentru facultate": {
    en: "Personalized quizzes for university",
    fr: "Quiz personnalisés pour l'université",
  },
  "Generezi întrebări din materialele tale, cu explicații și feedback, ca să exersezi aplicarea ideilor, nu doar recitirea lor.": {
    en: "Generate questions from your own materials, with explanations and feedback, so you practise applying ideas instead of just rereading them.",
    fr: "Génère des questions depuis tes supports, avec explications et retour, pour t'entraîner à appliquer les idées plutôt qu'à seulement les relire.",
  },
  "Plan de recapitulare pentru sesiune": {
    en: "Review plan for exam season",
    fr: "Plan de révision pour la session",
  },
  "Reviss adună rezumate, cuvinte-cheie, flashcard-uri și progres într-un flux clar pentru colocvii, examene și licență.": {
    en: "Reviss brings summaries, keywords, flashcards and progress together in a clear flow for tests, exams and thesis prep.",
    fr: "Reviss rassemble résumés, mots-clés, flashcards et progression dans un flux clair pour les contrôles, examens et mémoire.",
  },
  "Care este rolul principal al ribozomilor?": {
    en: "What is the main role of ribosomes?",
    fr: "Quel est le rôle principal des ribosomes ?",
  },
  "Ribozomii sintetizează proteine prin traducerea informației din ARNm.": {
    en: "Ribosomes synthesize proteins by translating information from mRNA.",
    fr: "Les ribosomes synthétisent les protéines en traduisant l'information de l'ARNm.",
  },
  "Chimie organică": {
    en: "Organic chemistry",
    fr: "Chimie organique",
  },
  "Ce definește o legătură covalentă?": {
    en: "What defines a covalent bond?",
    fr: "Qu'est-ce qui définit une liaison covalente ?",
  },
  "Punerea în comun a uneia sau mai multor perechi de electroni.": {
    en: "The sharing of one or more pairs of electrons.",
    fr: "Le partage d'une ou plusieurs paires d'électrons.",
  },
  "Istorie modernă": {
    en: "Modern history",
    fr: "Histoire moderne",
  },
  "În ce an a început Revoluția Franceză?": {
    en: "In what year did the French Revolution begin?",
    fr: "En quelle année la Révolution française a-t-elle commencé ?",
  },
  "Revoluția Franceză a început în anul 1789.": {
    en: "The French Revolution began in 1789.",
    fr: "La Révolution française a commencé en 1789.",
  },
  "Programare": {
    en: "Programming",
    fr: "Programmation",
  },
  "Încarci cursul, iar Reviss extrage ideile-cheie și le transformă în flashcard-uri. Derulează pentru a răsfoi pachetul în ambele direcții.": {
    en: "Upload the course, and Reviss extracts the key ideas and turns them into flashcards. Scroll to browse the pack in both directions.",
    fr: "Importe le cours, et Reviss extrait les idées clés pour les transformer en flashcards. Fais défiler pour parcourir le paquet dans les deux sens.",
  },
  "Derulează pentru a răsfoi pachetul în ambele direcții.": {
    en: "Scroll to browse the pack in both directions.",
    fr: "Fais défiler pour parcourir le paquet dans les deux sens.",
  },
  "Apasă pe primul card pentru a-l întoarce și click din nou pentru a reveni la întrebare.": {
    en: "Press the first card to flip it, then click again to return to the question.",
    fr: "Appuie sur la première carte pour la retourner, puis clique à nouveau pour revenir à la question.",
  },
  "Cel mai bun raport pentru studenți activi.": {
    en: "The best value for active students.",
    fr: "Le meilleur rapport qualité-prix pour les étudiants actifs.",
  },
  "Pentru sesiuni intense și mai multe materii.": {
    en: "For intense sessions and multiple subjects.",
    fr: "Pour les sessions intensives et plusieurs matières.",
  },
  "Prioritate la generare": {
    en: "Priority generation",
    fr: "Génération prioritaire",
  },
  "Highlight-uri și explicații AI": {
    en: "Highlights and AI explanations",
    fr: "Surlignages et explications IA",
  },
  "Suport prioritar": {
    en: "Priority support",
    fr: "Support prioritaire",
  },
  "Predicții avansate de pregătire": {
    en: "Advanced readiness predictions",
    fr: "Prédictions avancées de préparation",
  },
  "25% reducere lansare": {
    en: "25% launch discount",
    fr: "25 % de réduction de lancement",
  },
  "20 RON economie": {
    en: "20 RON savings",
    fr: "20 RON d'économie",
  },
  "10 RON economie": {
    en: "10 RON savings",
    fr: "10 RON d'économie",
  },
  "RON / lună": {
    en: "RON / month",
    fr: "RON / mois",
  },
  "RON / an": {
    en: "RON / year",
    fr: "RON / an",
  },
  "RON / permanent": {
    en: "RON / lifetime",
    fr: "RON / permanent",
  },
  "RON gratuit": {
    en: "RON free",
    fr: "RON gratuit",
  },
  "gratuit": {
    en: "free",
    fr: "gratuit",
  },
  "examene": {
    en: "exams",
    fr: "examens",
  },
  "Materiale nelimitate rezonabil": {
    en: "Reasonably unlimited materials",
    fr: "Supports illimités raisonnablement",
  },
  "AI de bază": {
    en: "Basic AI",
    fr: "IA de base",
  },
  "Istoric limitat": {
    en: "Limited history",
    fr: "Historique limité",
  },
  "Repetiție inteligentă și strategii AI": {
    en: "Smart repetition and AI strategies",
    fr: "Répétition intelligente et stratégies IA",
  },
  "Export și arhivă extinsă": {
    en: "Export and extended archive",
    fr: "Export et archive étendue",
  },
  "Navigare": {
    en: "Navigation",
    fr: "Navigation",
  },
  "Ce include": {
    en: "What is included",
    fr: "Ce qui est inclus",
  },
  "Limitele planului": {
    en: "Plan limits",
    fr: "Limites du forfait",
  },
  "Condiții de utilizare": {
    en: "Terms of use",
    fr: "Conditions d'utilisation",
  },
  "Materiale pe lună": {
    en: "Materials per month",
    fr: "Supports par mois",
  },
  "Fișiere pe proiect": {
    en: "Files per project",
    fr: "Fichiers par projet",
  },
  "Mărime maximă fișier": {
    en: "Maximum file size",
    fr: "Taille maximale du fichier",
  },
  "Pagini pe material": {
    en: "Pages per material",
    fr: "Pages par support",
  },
  "Flashcard-uri generate inițial": {
    en: "Initial generated flashcards",
    fr: "Flashcards initiales générées",
  },
  "Întrebări pe quiz": {
    en: "Questions per quiz",
    fr: "Questions par quiz",
  },
  "Documente scanate (OCR)": {
    en: "Scanned documents (OCR)",
    fr: "Documents scannés (OCR)",
  },
  "Chat AI pe proiect": {
    en: "AI chat per project",
    fr: "Chat IA par projet",
  },
  "Incluse": {
    en: "Included",
    fr: "Inclus",
  },
  "Neincluse": {
    en: "Not included",
    fr: "Non inclus",
  },
  "Inclus": {
    en: "Included",
    fr: "Inclus",
  },
  "Neinclus": {
    en: "Not included",
    fr: "Non inclus",
  },
  "Fără plată": {
    en: "No payment",
    fr: "Aucun paiement",
  },
  "Oricând, din cont": {
    en: "Anytime, from account",
    fr: "À tout moment, depuis le compte",
  },
  "Plata se procesează securizat prin Stripe. Vezi": {
    en: "Payment is securely processed through Stripe. See",
    fr: "Le paiement est traité de manière sécurisée via Stripe. Voir",
  },
  "Potrivit pentru testarea fluxului. Documentele scanate sau OCR nu sunt incluse in acest plan.": {
    en: "Suitable for testing the flow. Scanned documents or OCR are not included in this plan.",
    fr: "Adapté pour tester le flux. Les documents scannés ou l'OCR ne sont pas inclus dans ce forfait.",
  },
  "Pentru utilizare individuala activa. Limitele sunt lunare si se reseteaza automat.": {
    en: "For active individual use. Limits are monthly and reset automatically.",
    fr: "Pour un usage individuel actif. Les limites sont mensuelles et se réinitialisent automatiquement.",
  },
  "Pentru sesiuni intense si volume mari rezonabile. Utilizarea trebuie sa ramana educationala si individuala.": {
    en: "For intense sessions and reasonably large volumes. Use must remain educational and individual.",
    fr: "Pour des sessions intensives et des volumes raisonnablement importants. L'utilisation doit rester éducative et individuelle.",
  },
  "Reviss este un instrument educațional. Conținutul generat automat poate conține erori și trebuie verificat.": {
    en: "Reviss is an educational tool. Automatically generated content may contain errors and should be checked.",
    fr: "Reviss est un outil éducatif. Le contenu généré automatiquement peut contenir des erreurs et doit être vérifié.",
  },
  "Toate drepturile rezervate.": {
    en: "All rights reserved.",
    fr: "Tous droits réservés.",
  },
  ". Toate drepturile rezervate.": {
    en: ". All rights reserved.",
    fr: ". Tous droits réservés.",
  },
  "Plata se face lunar, fără perioadă contractuală.": {
    en: "Payment is monthly, with no fixed contract period.",
    fr: "Paiement mensuel, sans engagement contractuel.",
  },
};

const uiPatternTranslations: UiPatternTranslation[] = [
  {
    source: /^Pentru primul curs (?:și|si) testarea fluxului Rev(?:iss|izzio)\.$/,
    en: () => "For your first course and testing the Reviss flow.",
    fr: () => "Pour ton premier cours et tester le flux Reviss.",
  },
  {
    source: /^(\d+) dezactivate pe planul curent$/,
    en: ([, count]) => `${count} deactivated on your current plan`,
    fr: ([, count]) => `${count} désactivés avec ton forfait actuel`,
  },
  {
    source: /^1 dezactivat pe planul curent$/,
    en: () => "1 deactivated on your current plan",
    fr: () => "1 désactivé avec ton forfait actuel",
  },
  {
    source: /^Ai (\d+) proiecte pregătite pentru studiu\.$/,
    en: ([, count]) => `You have ${count} projects ready for study.`,
    fr: ([, count]) => `Tu as ${count} projets prêts pour l'étude.`,
  },
  {
    source: /^Ai 1 proiect pregătit pentru studiu\.$/,
    en: () => "You have 1 project ready for study.",
    fr: () => "Tu as 1 projet prêt pour l'étude.",
  },
  {
    source: /^(\d+) din (\d+) flashcard-uri$/,
    en: ([, current, total]) => `${current} of ${total} flashcards`,
    fr: ([, current, total]) => `${current} sur ${total} flashcards`,
  },
  {
    source: /^(\d+) flashcard-uri din greșeli$/,
    en: ([, count]) => `${count} mistake flashcards`,
    fr: ([, count]) => `${count} flashcards d'erreurs`,
  },
  {
    source: /^Întrebarea (\d+) din (\d+)$/,
    en: ([, current, total]) => `Question ${current} of ${total}`,
    fr: ([, current, total]) => `Question ${current} sur ${total}`,
  },
  {
    source: /^Ai obținut (\d+)\/(\d+) răspunsuri corecte\.$/,
    en: ([, correct, total]) => `You got ${correct}/${total} correct answers.`,
    fr: ([, correct, total]) => `Tu as obtenu ${correct}/${total} bonnes réponses.`,
  },
  {
    source: /^(\d+) materiale selectate$/,
    en: ([, count]) => `${count} selected materials`,
    fr: ([, count]) => `${count} supports sélectionnés`,
  },
  {
    source: /^(.+) în total$/,
    en: ([, value]) => `${value} total`,
    fr: ([, value]) => `${value} au total`,
  },
  {
    source: /^(\d+) înregistrări$/,
    en: ([, count]) => `${count} records`,
    fr: ([, count]) => `${count} enregistrements`,
  },
  {
    source: /^Maximum (\d+) fișiere\/proiect, (\d+) MB\/fișier, (\d+) MB\/proiect\. Cota lunară: (\d+) materiale\.$/,
    en: ([, files, fileMb, projectMb, monthly]) =>
      `Maximum ${files} files/project, ${fileMb} MB/file, ${projectMb} MB/project. Monthly quota: ${monthly} materials.`,
    fr: ([, files, fileMb, projectMb, monthly]) =>
      `Maximum ${files} fichiers/projet, ${fileMb} Mo/fichier, ${projectMb} Mo/projet. Quota mensuel : ${monthly} supports.`,
  },
  {
    source: /^Planul (.+) permite maximum (\d+) fișiere într-un proiect\.$/,
    en: ([, plan, count]) =>
      `The ${plan} plan allows a maximum of ${count} files in one project.`,
    fr: ([, plan, count]) =>
      `Le plan ${plan} permet au maximum ${count} fichiers dans un projet.`,
  },
  {
    source: /^Au fost păstrate doar primele (\d+) fișiere permise de plan\.$/,
    en: ([, count]) =>
      `Only the first ${count} files allowed by your plan were kept.`,
    fr: ([, count]) =>
      `Seuls les ${count} premiers fichiers autorisés par ton plan ont été conservés.`,
  },
  {
    source: /^Un fișier poate avea cel mult (\d+) MB pe planul (.+)\.$/,
    en: ([, size, plan]) =>
      `A file can be at most ${size} MB on the ${plan} plan.`,
    fr: ([, size, plan]) =>
      `Un fichier peut faire au maximum ${size} Mo avec le plan ${plan}.`,
  },
  {
    source: /^Materialele proiectului pot avea cel mult (\d+) MB în total\.$/,
    en: ([, size]) =>
      `Project materials can be at most ${size} MB in total.`,
    fr: ([, size]) =>
      `Les supports du projet peuvent faire au maximum ${size} Mo au total.`,
  },
  {
    source: /^Selecția depășește limitele planului (.+)\.$/,
    en: ([, plan]) => `The selection exceeds the limits of the ${plan} plan.`,
    fr: ([, plan]) => `La sélection dépasse les limites du plan ${plan}.`,
  },
  {
    source: /^Salut! Sunt AI-ul pentru proiectul „(.+)”. Întreabă-mă orice despre materialul acesta\.$/,
    en: ([, project]) =>
      `Hi! I am the AI for “${project}”. Ask me anything about this material.`,
    fr: ([, project]) =>
      `Salut ! Je suis l'IA du projet « ${project} ». Pose-moi n'importe quelle question sur ce support.`,
  },
  {
    source: /^Flashcard-uri pentru (.+)$/,
    en: ([, project]) => `Flashcards for ${project}`,
    fr: ([, project]) => `Flashcards pour ${project}`,
  },
  {
    source: /^Rezumat pentru (.+)$/,
    en: ([, project]) => `Summary for ${project}`,
    fr: ([, project]) => `Résumé pour ${project}`,
  },
  {
    source: /^Strategii pentru (.+)$/,
    en: ([, project]) => `Strategies for ${project}`,
    fr: ([, project]) => `Stratégies pour ${project}`,
  },
  {
    source: /^Întreabă despre (.+)$/,
    en: ([, project]) => `Ask about ${project}`,
    fr: ([, project]) => `Pose une question sur ${project}`,
  },
  {
    source: /^(\d+) flashcard-uri$/,
    en: ([, count]) => `${count} flashcards`,
    fr: ([, count]) => `${count} flashcards`,
  },
  {
    source: /^(\d+) quiz-uri$/,
    en: ([, count]) => `${count} quizzes`,
    fr: ([, count]) => `${count} quiz`,
  },
  {
    source: /^(\d+) materiale$/,
    en: ([, count]) => `${count} materials`,
    fr: ([, count]) => `${count} supports`,
  },
  {
    source: /^(\d+) greșeli$/,
    en: ([, count]) => `${count} mistakes`,
    fr: ([, count]) => `${count} erreurs`,
  },
  {
    source: /^(\d+) flashcard-uri în proiect$/,
    en: ([, count]) => `${count} flashcards in the project`,
    fr: ([, count]) => `${count} flashcards dans le projet`,
  },
  {
    source: /^(\d+)\/(\d+) răspunse$/,
    en: ([, current, total]) => `${current}/${total} answered`,
    fr: ([, current, total]) => `${current}/${total} répondues`,
  },
  {
    source: /^Pregătirea estimată crește cu (\d+)%\.$/,
    en: ([, value]) => `Estimated readiness increases by ${value}%.`,
    fr: ([, value]) => `La préparation estimée augmente de ${value} %.`,
  },
  {
    source: /^Ștergi proiectul arhivat „(.+)”\?$/,
    en: ([, project]) => `Delete archived project “${project}”?`,
    fr: ([, project]) => `Supprimer le projet archivé « ${project} » ?`,
  },
  {
    source: /^Oprești plata lunară pentru (.+)\?$/,
    en: ([, plan]) => `Stop the monthly payment for ${plan}?`,
    fr: ([, plan]) => `Arrêter le paiement mensuel pour ${plan} ?`,
  },
  {
    source: /^(.+) activ$/,
    en: ([, plan]) => `${plan} active`,
    fr: ([, plan]) => `${plan} actif`,
  },
  {
    source: /^(.+) materiale procesate lunar$/,
    en: ([, count]) => `${count} materials processed monthly`,
    fr: ([, count]) => `${count} supports traités par mois`,
  },
  {
    source: /^Maximum (.+) pagini per material$/,
    en: ([, count]) => `Maximum ${count} pages per material`,
    fr: ([, count]) => `Maximum ${count} pages par support`,
  },
  {
    source: /^(.+) RON \/ lună$/,
    en: ([, price]) => `${price} RON / month`,
    fr: ([, price]) => `${price} RON / mois`,
  },
  {
    source: /^(.+) RON economie$/,
    en: ([, value]) => `${value} RON savings`,
    fr: ([, value]) => `${value} RON d'économie`,
  },
  {
    source: /^(\d+)% reducere lansare$/,
    en: ([, value]) => `${value}% launch discount`,
    fr: ([, value]) => `${value} % de réduction de lancement`,
  },
  {
    source: /^Planul (.+)$/,
    en: ([, plan]) => `${plan} plan`,
    fr: ([, plan]) => `Forfait ${plan}`,
  },
  {
    source: /^Încearcă planul (.+)$/,
    en: ([, plan]) => `Try the ${plan} plan`,
    fr: ([, plan]) => `Essayer le forfait ${plan}`,
  },
  {
    source: /^© (\d{4}) (.+)\. Toate drepturile rezervate\.$/,
    en: ([, year, company]) => `© ${year} ${company}. All rights reserved.`,
    fr: ([, year, company]) => `© ${year} ${company}. Tous droits réservés.`,
  },
];

const normalizedUiSourceByText = new Map<string, string>();
const normalizedSourceByTranslation = new Map<string, string>();

for (const [source, values] of Object.entries(uiTranslations)) {
  normalizedUiSourceByText.set(normalizeText(source), source);
  normalizedSourceByTranslation.set(normalizeText(source), source);
  normalizedSourceByTranslation.set(normalizeText(values.en), source);
  normalizedSourceByTranslation.set(normalizeText(values.fr), source);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function resolveUiTextSource(value: string) {
  const normalizedValue = normalizeText(value);
  const exactSource =
    normalizedUiSourceByText.get(normalizedValue) ??
    normalizedSourceByTranslation.get(normalizedValue);

  if (exactSource) {
    return exactSource;
  }

  const patternSource = uiPatternTranslations.find(({ source }) =>
    source.test(normalizedValue),
  );

  return patternSource ? normalizedValue : null;
}

export function translateUiText(
  source: string,
  language: LanguagePreference,
) {
  if (language === "ro") {
    return source;
  }

  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const leading = match?.[1] ?? "";
  const body = match?.[2] ?? source;
  const trailing = match?.[3] ?? "";
  const normalizedBody = normalizeText(body);
  const exactTranslation = uiTranslations[normalizedBody]?.[language];

  if (exactTranslation) {
    return `${leading}${exactTranslation}${trailing}`;
  }

  const patternTranslation = uiPatternTranslations.find(({ source }) =>
    source.test(normalizedBody),
  );
  const patternMatch = patternTranslation
    ? normalizedBody.match(patternTranslation.source)
    : null;
  const translated =
    patternTranslation && patternMatch
      ? patternTranslation[language](patternMatch)
      : body;

  return `${leading}${translated}${trailing}`;
}
