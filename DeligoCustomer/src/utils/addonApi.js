import { customerApi } from './api';

export const fetchAddonGroup = async (id) => {
    try {
        // Check if ID is valid to avoid unnecessary API calls
        if (!id || typeof id !== 'string') throw new Error('Invalid Add-on Group ID');

        // As per user provided info: GET /api/v1/addons/:addonGroupId
        const response = await customerApi.get(`/add-ons/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching addon group ${id}:`, error);
        throw error;
    }
};

export const fetchAddonGroups = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    try {
        // Fetch all groups in parallel
        const promises = ids.map(id => fetchAddonGroup(id).catch(e => null));
        const results = await Promise.all(promises);
        // Filter out failed requests (nulls) and return the data directly
        return results.filter(r => r && (r.data || r));
    } catch (error) {
        console.error('Error fetching addon groups:', error);
        return [];
    }
};
