import Swal, { SweetAlertOptions, SweetAlertIcon } from 'sweetalert2';

// Custom mixin dengan tema Pertanian Modern (Emerald Green)
const ModernSwal = Swal.mixin({
  customClass: {
    popup: 'modern-swal-popup rounded-3xl border border-slate-200 shadow-2xl p-6 font-sans',
    title: 'text-slate-900 font-black text-lg',
    htmlContainer: 'text-slate-600 text-xs sm:text-sm leading-relaxed',
    actions: 'swal2-actions flex items-center justify-center gap-3 mt-5',
    confirmButton:
      'swal-confirm-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition mx-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500',
    cancelButton:
      'swal-cancel-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-sm transition mx-1.5 focus:outline-none',
    denyButton:
      'px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition mx-1.5',
    input: 'rounded-xl border border-slate-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-sans',
  },
  buttonsStyling: false,
});

/**
 * Alert Sukses Modern
 */
export async function showSuccess(title: string, text?: string) {
  return ModernSwal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Selesai',
    timer: 3500,
    timerProgressBar: true,
  });
}

/**
 * Alert Error / Gagal Modern
 */
export async function showError(title: string, text?: string) {
  return ModernSwal.fire({
    icon: 'error',
    title,
    text: text || 'Terjadi kendala saat memproses permintaan.',
    confirmButtonText: 'Mengerti',
    customClass: {
      popup: 'modern-swal-popup rounded-3xl border border-rose-200 shadow-2xl p-6 font-sans',
      title: 'text-slate-900 font-black text-lg',
      htmlContainer: 'text-slate-600 text-xs sm:text-sm',
      actions: 'swal2-actions flex items-center justify-center gap-3 mt-5',
      confirmButton:
        'swal-danger-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition mx-1.5',
    },
    buttonsStyling: false,
  });
}

/**
 * Alert Peringatan Modern
 */
export async function showWarning(title: string, text?: string) {
  return ModernSwal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Tutup',
  });
}

/**
 * Alert Info Modern
 */
export async function showInfo(title: string, text?: string) {
  return ModernSwal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Tutup',
  });
}

/**
 * Toast Notification di Pojok Kanan Atas
 */
export function showToast(title: string, icon: SweetAlertIcon = 'success') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 shadow-lg p-3 font-sans text-xs',
      title: 'text-slate-800 font-bold text-xs',
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  return Toast.fire({
    icon,
    title,
  });
}

/**
 * Konfirmasi Aksi Umum (Pengganti window.confirm)
 */
export async function showConfirm(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
}): Promise<boolean> {
  const result = await ModernSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || 'question',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Ya, Lanjutkan',
    cancelButtonText: options.cancelButtonText || 'Batal',
    reverseButtons: true,
  });

  return result.isConfirmed;
}

/**
 * Konfirmasi Hapus Data Modern (Warna Merah Khusus Delete)
 */
export async function showDeleteConfirm(
  itemName: string,
  customText?: string
): Promise<boolean> {
  const result = await ModernSwal.fire({
    title: 'Konfirmasi Hapus Data',
    html:
      customText ||
      `Apakah Anda yakin ingin menghapus <strong>"${itemName}"</strong>?<br/><span class="text-xs text-rose-600 block mt-1.5 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus Data',
    cancelButtonText: 'Batal',
    reverseButtons: true,
    customClass: {
      popup: 'modern-swal-popup rounded-3xl border border-slate-200 shadow-2xl p-6 font-sans',
      title: 'text-slate-900 font-black text-lg',
      htmlContainer: 'text-slate-600 text-xs sm:text-sm leading-relaxed',
      actions: 'swal2-actions flex items-center justify-center gap-3 mt-5',
      confirmButton:
        'swal-danger-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition mx-1.5',
      cancelButton:
        'swal-cancel-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-sm transition mx-1.5',
    },
    buttonsStyling: false,
  });

  return result.isConfirmed;
}

/**
 * Prompt Input Teks Modern (Pengganti window.prompt)
 */
export async function showPrompt(options: {
  title: string;
  text?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  inputValidator?: (value: string) => string | null;
}): Promise<string | null> {
  const result = await ModernSwal.fire({
    title: options.title,
    text: options.text,
    input: 'text',
    inputValue: options.inputValue || '',
    inputPlaceholder: options.inputPlaceholder || 'Ketik catatan di sini...',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Kirim / Simpan',
    cancelButtonText: options.cancelButtonText || 'Batal',
    reverseButtons: true,
    inputValidator: (value) => {
      if (options.inputValidator) {
        return options.inputValidator(value);
      }
      return null;
    },
  });

  if (result.isConfirmed) {
    return result.value || '';
  }
  return null;
}

export default ModernSwal;
