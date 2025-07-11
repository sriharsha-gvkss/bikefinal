package com.taxi.booking.util;

public class GeohashUtils {
    
    private static final char[] BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz".toCharArray();
    
    public static String encode(double lat, double lon, int precision) {
        boolean even = true;
        int bit = 0;
        int ch = 0;
        StringBuilder geohash = new StringBuilder();
        
        double[] latRange = {-90, 90};
        double[] lonRange = {-180, 180};
        
        while (geohash.length() < precision) {
            double mid;
            
            if (even) {
                mid = (lonRange[0] + lonRange[1]) / 2;
                if (lon > mid) {
                    ch |= 16 >> bit;
                    lonRange[0] = mid;
                } else {
                    lonRange[1] = mid;
                }
            } else {
                mid = (latRange[0] + latRange[1]) / 2;
                if (lat > mid) {
                    ch |= 16 >> bit;
                    latRange[0] = mid;
                } else {
                    latRange[1] = mid;
                }
            }
            
            even = !even;
            
            if (++bit == 5) {
                geohash.append(BASE32[ch]);
                bit = 0;
                ch = 0;
            }
        }
        
        return geohash.toString();
    }
    
    public static double distance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth's radius in kilometers
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
} 