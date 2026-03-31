import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Trash2, Loader2, X } from "lucide-react";
import { JobNote } from "@/lib/types";
import { addJobNote, deleteJobNote, uploadJobPhoto } from "@/lib/storage";
import { toast } from "sonner";

interface JobNotesProps {
  jobId: string;
  notes: JobNote[];
  onReload: () => Promise<void>;
}

export function JobNotes({ jobId, notes, onReload }: JobNotesProps) {
  // Todo o estado declarado antes de qualquer uso
  const [texto, setTexto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPhoto(URL.createObjectURL(file));
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const clearPendingPhoto = () => {
    setPendingPhoto(null);
    setPendingFile(null);
  };

  const handleAdd = async () => {
    if (!texto.trim() && !pendingFile) {
      toast.error("Escreva algo ou adicione uma foto.");
      return;
    }
    setUploading(true);
    try {
      let fotoUrl: string | undefined;
      if (pendingFile) {
        const url = await uploadJobPhoto(pendingFile);
        if (!url) {
          toast.error("Erro ao enviar foto. Tente novamente.");
          return;
        }
        fotoUrl = url;
      }
      const result = await addJobNote(jobId, { texto: texto.trim(), fotoUrl });
      if (!result) {
        toast.error("Erro ao salvar anotação.");
        return;
      }
      setTexto("");
      clearPendingPhoto();
      await onReload();
      toast.success("Anotação salva!");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    await deleteJobNote(noteId);
    await onReload();
    toast.success("Anotação removida.");
  };

  const openLightbox = (url: string) => setLightbox(url);
  const closeLightbox = () => setLightbox(null);

  return (
    <div className="space-y-4">
      {/* Formulário de nova anotação */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <Textarea
          placeholder="Escreva uma anotação..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={3}
          className="resize-none"
        />

        {pendingPhoto && (
          <div className="relative w-24 h-24">
            <img src={pendingPhoto} alt="preview" className="w-24 h-24 object-cover rounded-lg" />
            <button
              type="button"
              onClick={clearPendingPhoto}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraRef.current?.click()}
            className="gap-1.5"
            disabled={uploading}
          >
            <Camera className="h-4 w-4" />
            Foto
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={uploading}
            className="flex-1"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {uploading ? 'Salvando...' : 'Adicionar'}
          </Button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Lista de anotações */}
      {notes.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-xl shadow-card">
          <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Escreva ou tire uma foto para registrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-card rounded-xl p-3 shadow-card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(note.createdAt).toLocaleString("pt-BR")}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {note.texto && (
                <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{note.texto}</p>
              )}

              {note.fotoUrl && (
                <button
                  type="button"
                  onClick={() => openLightbox(note.fotoUrl!)}
                  className="w-full"
                >
                  <img
                    src={note.fotoUrl}
                    alt="foto da anotação"
                    className="w-full max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <img
            src={lightbox}
            alt="foto ampliada"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
