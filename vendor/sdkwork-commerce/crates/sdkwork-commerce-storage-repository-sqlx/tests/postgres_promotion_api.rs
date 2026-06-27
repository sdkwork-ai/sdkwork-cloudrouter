use sdkwork_commerce_promotion_repository_sqlx::PostgresCommercePromotionStore;
use sdkwork_commerce_promotion_service::{
    PointsBalanceQuery, PointsHistoryQuery, PromotionCodeRedemptionCommand,
    PromotionUserCouponListQuery,
};

#[test]
fn postgres_promotion_store_api_is_publicly_constructible() {
    let _: fn(sqlx::PgPool) -> PostgresCommercePromotionStore = PostgresCommercePromotionStore::new;
    let _ = PostgresCommercePromotionStore::list_promotion_user_coupons;
    let _ = PostgresCommercePromotionStore::retrieve_points_balance;
    let _ = PostgresCommercePromotionStore::list_points_history;
    let _ = PostgresCommercePromotionStore::redeem_promotion_code;

    let _ = std::mem::size_of::<PromotionUserCouponListQuery>();
    let _ = std::mem::size_of::<PointsBalanceQuery>();
    let _ = std::mem::size_of::<PointsHistoryQuery>();
    let _ = std::mem::size_of::<PromotionCodeRedemptionCommand>();
}
