import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "@/hooks/use-toast";

// Checagem periódica de nova versão - o navegador só verifica o service
// worker sozinho em navegações/reloads, mas o app costuma ficar aberto por
// horas como PWA instalado (só troca de app, nunca fecha de verdade). Sem
// isso, um deploy podia nunca chegar até a próxima vez que o app fosse
// realmente reaberto do zero.
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function AppUpdatePrompt() {
  const { toast } = useToast();

  useEffect(() => {
    if (import.meta.env.DEV) {
      void navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });

      void caches?.keys().then((keys) => {
        keys
          .filter((key) => key.includes("workbox") || key.includes("precache") || key.includes("vitalissy"))
          .forEach((key) => {
            void caches.delete(key);
          });
      });

      return;
    }

    const updateServiceWorker = registerSW({
      immediate: true,
      // Antes isso só mostrava um toast com botão "Atualizar" - fácil de
      // perder (some sozinho, ou o app fica aberto em segundo plano sem
      // ninguém ver). Aplica a versão nova sozinho, sem depender de clique:
      // o próprio registerSW recarrega a página depois de ativar.
      onNeedRefresh() {
        void updateServiceWorker(true);
      },
      onOfflineReady() {
        toast({
          title: "Vitalissy pronta offline",
          description: "Algumas telas já podem abrir mesmo sem conexão.",
        });
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        setInterval(() => {
          void registration.update();
        }, UPDATE_CHECK_INTERVAL_MS);
      },
    });
  }, [toast]);

  return null;
}
