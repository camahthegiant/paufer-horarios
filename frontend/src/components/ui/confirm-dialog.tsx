"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";

type Opts = { titulo?: string; mensaje: string; etiqueta?: string; peligro?: boolean };
type Confirmar = (o: Opts) => Promise<boolean>;

const ConfirmCtx = createContext<Confirmar | null>(null);

// Sustituye a window.confirm(): `if (!(await confirmar({ mensaje }))) return;`
export function useConfirm(): Confirmar {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm fuera de ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const tc = useTranslations("common");
  const [opts, setOpts] = useState<Opts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback<Confirmar>((o) => {
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  function cerrar(valor: boolean) {
    resolver.current?.(valor);
    resolver.current = null;
    setOpts(null);
  }

  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      <Modal open={opts !== null} titulo={opts?.titulo ?? tc("confirmar")} onClose={() => cerrar(false)}>
        <p className="text-sm text-muted">{opts?.mensaje}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => cerrar(false)}>{tc("cancelar")}</Button>
          <Button variant={opts?.peligro === false ? "primary" : "danger"} onClick={() => cerrar(true)}>
            {opts?.etiqueta ?? tc("eliminar")}
          </Button>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
