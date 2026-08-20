import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

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
      onNeedRefresh() {
        toast({
          title: "Nova versão disponível",
          description: "Atualize para carregar os ajustes mais recentes.",
          action: (
            <ToastAction altText="Atualizar" onClick={() => void updateServiceWorker(true)}>
              Atualizar
            </ToastAction>
          ),
        });
      },
      onOfflineReady() {
        toast({
          title: "Vitalissy pronta offline",
          description: "Algumas telas já podem abrir mesmo sem conexão.",
        });
      },
    });
  }, [toast]);

  return null;
}
