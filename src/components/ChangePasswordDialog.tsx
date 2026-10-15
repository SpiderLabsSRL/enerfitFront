// src/components/ChangePasswordDialog.tsx
import { useState } from "react";
import { Eye, EyeOff, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { changePassword } from "@/api/sidebarPasswordApi";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "La contraseña actual es obligatoria";
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "La nueva contraseña es obligatoria";
    } else if (newPassword.length < 4) {
      newErrors.newPassword = "La contraseña debe tener al menos 4 caracteres";
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = "Debe contener letras y números";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu nueva contraseña";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar la contraseña",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleChangePassword();
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Key size={16} className="mr-2" />
          Cambiar Contraseña
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y la nueva contraseña. Mínimo 4
            caracteres con letras y números.
          </DialogDescription>
        </DialogHeader>

        {/* Aquí usamos un div en lugar de form para evitar el submit automático */}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.currentPassword ? "border-destructive" : ""}
                placeholder="Ingresa tu contraseña actual"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isLoading}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.newPassword ? "border-destructive" : ""}
                placeholder="Mínimo 4 caracteres con letras y números"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className={errors.confirmPassword ? "border-destructive" : ""}
                placeholder="Repite la nueva contraseña"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? "Cambiando..." : "Cambiar Contraseña"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
