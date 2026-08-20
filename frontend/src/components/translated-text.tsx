"use client";

import type { TranslationKey } from "@/components/language-provider";
import { useLanguage } from "@/components/language-provider";

type TranslatedTextProps = {
  id: TranslationKey;
};

export function TranslatedText({ id }: TranslatedTextProps) {
  const { t } = useLanguage();

  return <>{t(id)}</>;
}
