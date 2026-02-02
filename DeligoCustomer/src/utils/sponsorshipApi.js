import { customerApi } from './api';
import { API_ENDPOINTS } from '../constants/config';

/**
 * Sponsorship API Service
 */
const sponsorshipApi = {
    /**
     * Fetch all sponsorships
     * @returns {Promise<Array>} List of sponsorships
     */
    getAllSponsorships: async () => {
        try {
            const response = await customerApi.get(API_ENDPOINTS.SPONSORSHIPS.GET_ALL);
            if (response && response.success && Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching sponsorships:', error);
            return [];
        }
    },
};

export default sponsorshipApi;
