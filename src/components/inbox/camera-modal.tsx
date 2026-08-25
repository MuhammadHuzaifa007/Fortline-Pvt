"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera, X, Image as ImageIcon, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (file: File, caption: string) => void;
  onFallback: () => void;
}

export function CameraModal({
  open,
  onOpenChange,
  onSend,
  onFallback,
}: CameraModalProps) {
  const t = useTranslations("Inbox.camera");

  const [mode, setMode] = useState<"live" | "preview">("live");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [errorType, setErrorType] = useState<
    "denied" | "inuse" | "notfound" | "other" | null
  >(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Prevent multiple camera requests from running at the same time.
  const startInFlightRef = useRef(false);

  /**
   * Stop the currently active camera stream.
   */
  const stopStream = useCallback(() => {
    const stream = streamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track-stop errors.
        }
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Start the camera.
   *
   * Important:
   * - Only one getUserMedia request can run at a time.
   * - We only retry with simple video constraints for OverconstrainedError.
   * - Permission errors are NOT retried automatically.
   */
  const startStream = useCallback(async () => {
    if (startInFlightRef.current) {
      return;
    }

    startInFlightRef.current = true;

    stopStream();
    setErrorType(null);
    setErrorDetails(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setErrorType("notfound");
      setErrorDetails(
        "Camera API is unavailable. navigator.mediaDevices.getUserMedia is undefined. Make sure the page is loaded over HTTPS or localhost."
      );
      toast.error(t("notFound"));
      startInFlightRef.current = false;
      return;
    }

    try {
      let stream: MediaStream;

      try {
        // First attempt: preferred camera configuration.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr: unknown) {
        /**
         * Only retry when the constraints themselves are the problem.
         *
         * DO NOT retry NotAllowedError because that usually means
         * permission/policy denial and retrying does nothing.
         */
        if (
          constraintErr instanceof DOMException &&
          constraintErr.name === "OverconstrainedError"
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw constraintErr;
        }
      }

      // If the component disappeared while getUserMedia was waiting,
      // immediately release the newly acquired stream.
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track-stop errors.
          }
        });

        return;
      }

      streamRef.current = stream;

      videoRef.current.srcObject = stream;

      try {
        await videoRef.current.play();
      } catch {
        /**
         * Some browsers can reject play() even though the stream
         * itself is valid. The <video autoPlay muted playsInline>
         * attributes should normally handle this.
         */
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : String(err);

      setErrorDetails(errorMessage);

      if (err instanceof DOMException || err instanceof Error) {
        switch (err.name) {
          case "NotAllowedError":
          case "PermissionDeniedError":
          case "SecurityError":
            setErrorType("denied");
            toast.error(t("permissionDenied"));
            break;

          case "NotReadableError":
          case "TrackStartError":
            setErrorType("inuse");
            toast.error(t("inUse"));
            break;

          case "NotFoundError":
          case "DevicesNotFoundError":
            setErrorType("notfound");
            toast.error(t("notFound"));
            break;

          case "OverconstrainedError":
            setErrorType("notfound");
            toast.error(t("notFound"));
            break;

          default:
            setErrorType("other");
            toast.error(err.message || t("error"));
            break;
        }
      } else {
        setErrorType("other");
        toast.error(t("error"));
      }

      stopStream();
    } finally {
      startInFlightRef.current = false;
    }
  }, [facingMode, stopStream, t]);

  /**
   * Start/stop camera based on modal state.
   *
   * IMPORTANT:
   * The Try Again button only clears the error state.
   * This effect then starts the camera exactly once.
   */
  useEffect(() => {
    if (open && mode === "live" && !errorType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [open, mode, errorType, startStream, stopStream]);

  /**
   * Switch between front and rear cameras where supported.
   */
  const handleFlip = useCallback(() => {
    setFacingMode((prev) =>
      prev === "environment" ? "user" : "environment"
    );
  }, []);

  /**
   * Capture a frame from the live video and turn it into JPEG.
   */
  const captureFrame = useCallback(() => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    const MAX_DIMENSION = 1600;

    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const encode = (
      quality: number,
      callback: (blob: Blob | null) => void
    ) => {
      canvas.toBlob(
        (blob) => {
          callback(blob);
        },
        "image/jpeg",
        quality
      );
    };

    const setPreview = (blob: Blob) => {
      // Revoke previous preview URL before replacing it.
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setMode("preview");
    };

    encode(0.82, (blob) => {
      if (!blob) {
        return;
      }

      // If larger than 5MB, reduce quality.
      if (blob.size > 5 * 1024 * 1024) {
        encode(0.6, (smallerBlob) => {
          if (smallerBlob) {
            setPreview(smallerBlob);
          }
        });
      } else {
        setPreview(blob);
      }
    });
  }, [previewUrl]);

  /**
   * Go back from preview to live camera.
   */
  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewBlob(null);
    setPreviewUrl(null);
    setCaption("");
    setErrorType(null);
    setErrorDetails(null);
    setMode("live");
  }, [previewUrl]);

  /**
   * Send captured photo.
   */
  const handleSend = useCallback(() => {
    if (!previewBlob) {
      return;
    }

    const now = new Date();

    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const filename = `camera_${yyyy}${MM}${dd}_${HH}${mm}${ss}.jpg`;

    const file = new File([previewBlob], filename, {
      type: "image/jpeg",
    });

    onSend(file, caption);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewBlob(null);
    setPreviewUrl(null);
    setCaption("");

    onOpenChange(false);
  }, [previewBlob, caption, onSend, previewUrl, onOpenChange]);

  /**
   * Close the camera modal.
   */
  const handleClose = useCallback(() => {
    stopStream();
    onOpenChange(false);
  }, [onOpenChange, stopStream]);

  /**
   * Reset state when the modal closes.
   */
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("live");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewBlob(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaption("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorType(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorDetails(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviewUrl(null);
      }

      stopStream();
    }
  }, [open, previewUrl, stopStream]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-border h-[100dvh] sm:h-[85vh] sm:max-h-[850px] flex flex-col [&>button]:hidden">
        <DialogHeader className="absolute top-0 w-full z-10 p-4 bg-gradient-to-b from-black/60 to-transparent border-none">
          <DialogTitle className="sr-only">
            {t("takePhoto")}
          </DialogTitle>

          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
              onClick={handleClose}
              type="button"
            >
              <X className="h-6 w-6" />
            </Button>

            {mode === "live" && !errorType && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
                onClick={handleFlip}
                type="button"
              >
                <SwitchCamera className="h-6 w-6" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative flex items-center justify-center bg-black min-h-0">
          {mode === "live" ? (
            errorType ? (
              <div className="text-center p-6 space-y-4 z-20">
                <p className="text-white text-sm">
                  {errorType === "denied"
                    ? t("permissionDenied")
                    : errorType === "inuse"
                      ? t("inUse")
                      : errorType === "notfound"
                        ? t("notFound")
                        : t("error")}
                </p>

                {errorDetails && (
                  <div className="bg-white/10 text-red-200 text-xs px-4 py-2 rounded-md max-w-sm overflow-hidden break-words text-left">
                    <strong>Diagnostics:</strong>
                    <br />
                    {errorDetails}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="default"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      // IMPORTANT:
                      // Do not call startStream() here.
                      // Clearing errorType lets the effect above start it once.
                      setErrorType(null);
                      setErrorDetails(null);
                    }}
                    type="button"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Try again
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleClose();
                      onFallback();
                    }}
                    type="button"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {t("galleryFallback")}
                  </Button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )
          ) : (
            previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )
          )}
        </div>

        {!errorType && (
          <div className="bg-black p-4 z-10 space-y-4 pb-8 sm:pb-4 shrink-0">
            {mode === "live" ? (
              <div className="flex justify-center h-16 items-center">
                <button
                  type="button"
                  onClick={captureFrame}
                  className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={t("takePhoto")}
                >
                  <div className="h-[3.25rem] w-[3.25rem] bg-white rounded-full" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <input
                  type="text"
                  maxLength={1024}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("captionPlaceholder")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 outline-none focus:border-white/50"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent text-white border-white/20 hover:bg-white/10"
                    onClick={handleRetake}
                    type="button"
                  >
                    {t("retake")}
                  </Button>

                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleSend}
                    type="button"
                  >
                    {t("send")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}