/**
 * Addon API Utilities
 * 
 * Provides methods for fetching add-on group configurations, supporting both
 * single and batch retrieval operations.
 */

import { customerApi } from './api';

export const fetchAddonGroup = async (id) => {
    try {
        // Validate ID format
        if (!id || typeof id !== 'string') throw new Error('Invalid Add-on Group ID');

        // Fetch specific addon group configuration
        const response = await customerApi.get(`/add-ons/${id}`);
        return response.data;
    } catch (error) {
        // Log as warning instead of error to avoid blocking RedBox in development
        if (error.response?.status === 404) {
            console.warn(`Addon group ${id} not found (404). It might have been deleted.`);
        } else {
            console.warn(`Error fetching addon group ${id}:`, error.message);
        }
        throw error;
    }
};

export const fetchAddonGroups = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    try {
        // Batch retrieve addon groups
        const promises = ids.map(id => fetchAddonGroup(id).catch(e => null));
        const results = await Promise.all(promises);
        // Filter valid results
        return results.filter(r => r && (r.data || r));
    } catch (error) {
        console.warn('Error fetching addon groups:', error.message);
        return [];
    }
};
