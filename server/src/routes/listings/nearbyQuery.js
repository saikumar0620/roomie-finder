import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { buildPaginationMeta } from "../../utils/pagination.js";
import { serializeListing } from "../../utils/serializers.js";

export async function queryNearbyListings({ query, page, limit, skip }) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radiusKm = Math.min(Math.max(Number(query.radiusKm) || 5, 0.5), 50);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new HttpError(400, "Invalid latitude or longitude");
  }

  // Bounding box pre-filter so Postgres can use idx_listings_coords_available
  const dLat = radiusKm / 111.045;
  const dLng =
    radiusKm / (111.045 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const values = [lat, lng, lat - dLat, lat + dLat, lng - dLng, lng + dLng];
  const extraConditions = [];

  if (query.minRent) {
    values.push(Number(query.minRent));
    extraConditions.push(`l.rent >= $${values.length}`);
  }
  if (query.maxRent) {
    values.push(Number(query.maxRent));
    extraConditions.push(`l.rent <= $${values.length}`);
  }
  if (query.location) {
    values.push(`%${String(query.location).trim()}%`);
    extraConditions.push(`l.location ILIKE $${values.length}`);
  }
  if (query.preferences) {
    values.push(String(query.preferences).trim());
    extraConditions.push(`l.preferences = $${values.length}`);
  }
  if (query.amenities) {
    const amenList = String(query.amenities)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (amenList.length > 0) {
      values.push(amenList);
      extraConditions.push(`l.amenities @> $${values.length}::text[]`);
    }
  }
  if (query.verifiedOnly === "true") {
    extraConditions.push(`u.is_verified = true`);
  }

  values.push(radiusKm);
  const radiusParam = `$${values.length}`;

  const whereSql = [
    `l.is_available = true`,
    `l.latitude IS NOT NULL`,
    `l.longitude IS NOT NULL`,
    `l.latitude BETWEEN $3 AND $4`,
    `l.longitude BETWEEN $5 AND $6`,
    ...extraConditions,
  ].join(" AND ");

  const haversineSql = `
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians($1)) * cos(radians(l.latitude)) *
        cos(radians(l.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(l.latitude))
      ))
    )
  `;

  const countRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS total
     FROM (
       SELECT l.id, (${haversineSql}) AS distance_km
       FROM roomie_finder.listings l
       JOIN roomie_finder.users u ON u.id = l.user_id
       WHERE ${whereSql}
     ) sub
     WHERE distance_km <= ${radiusParam}`,
    ...values
  );
  const total = countRows[0]?.total || 0;

  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM (
       SELECT l.id, l.user_id, l.title, l.rent, l.location, l.latitude, l.longitude,
              l.description, l.preferences, l.amenities, l.images, l.is_available,
              l.created_at, l.updated_at,
              u.is_verified AS owner_verified,
              (${haversineSql}) AS distance_km
       FROM roomie_finder.listings l
       JOIN roomie_finder.users u ON u.id = l.user_id
       WHERE ${whereSql}
     ) sub
     WHERE distance_km <= ${radiusParam}
     ORDER BY distance_km ASC, created_at DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    ...values,
    limit,
    skip
  );

  const pagination = buildPaginationMeta({ page, limit, total });
  return {
    documents: rows.map(serializeListing),
    nextPage: pagination.nextPage,
    pagination,
  };
}
