import { defineStore } from 'pinia';
import api from '@/api';

export const useGalleryStore = defineStore('gallery', {
    state: () => ({
        overview: null,
        folders: [],
        currentFolderContent: {
            folder: null,
            files: [],
            pagination: {
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 1
            }
        },
        // Breadcrumbs simples: { id: 'root', name: 'Início' } -> { id: 'appointmentId', name: 'Consulta' }
        breadcrumbs: [{ id: null, name: 'Início' }],
        loading: false,
        error: null,
    }),

    actions: {
        async fetchOverview(patientId) {
            this.loading = true;
            try {
                const { data } = await api.get(`/gallery/patient/${patientId}/overview`);
                this.overview = data;
            } catch (err) {
                this.error = err.response?.data?.message || 'Erro ao carregar resumo da galeria';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },

        async fetchFolders(patientId) {
            this.loading = true;
            try {
                const { data } = await api.get(`/gallery/patient/${patientId}/folders`);
                this.folders = data;
                // Reset view to root
                this.currentFolderContent = {
                    folder: null,
                    files: [],
                    pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
                };
            } catch (err) {
                this.error = err.response?.data?.message || 'Erro ao carregar pastas';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },

        async fetchFolderContent(patientId, folderId, page = 1) {
            this.loading = true;
            // Clear files if new folder, but keep if paginating (optional, but cleaner UI to clear)
            if (page === 1) {
                // this.currentFolderContent.files = []; 
            }

            try {
                const { data } = await api.get(`/gallery/patient/${patientId}/folder/${folderId}`, {
                    params: { page, limit: 20 }
                });

                this.currentFolderContent = {
                    folder: data.folder,
                    files: data.files,
                    pagination: data.pagination || {
                        total: data.totalFiles || data.files.length,
                        page,
                        limit: 20,
                        totalPages: Math.ceil((data.totalFiles || data.files.length) / 20) || 1
                    }
                };

                // Update breadcrumbs
                const folderName = data.folder?.name || 'Pasta';
                this.breadcrumbs = [{ id: null, name: 'Início' }, { id: folderId, name: folderName }];
            } catch (err) {
                this.error = err.response?.data?.message || 'Erro ao carregar arquivos da pasta';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },

        resetNavigation() {
            this.currentFolderContent = { folder: null, files: [], totalFiles: 0 };
            this.breadcrumbs = [{ id: null, name: 'Início' }];
        }
    }
});
