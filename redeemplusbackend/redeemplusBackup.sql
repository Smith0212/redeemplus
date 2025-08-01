PGDMP         :                }         
   redeemplus %   14.18 (Ubuntu 14.18-0ubuntu0.22.04.1) %   14.18 (Ubuntu 14.18-0ubuntu0.22.04.1) �    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16426 
   redeemplus    DATABASE     Y   CREATE DATABASE redeemplus WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_IN';
    DROP DATABASE redeemplus;
                postgres    false            l           1247    16463    account_type_enum    TYPE     S   CREATE TYPE public.account_type_enum AS ENUM (
    'individual',
    'business'
);
 $   DROP TYPE public.account_type_enum;
       public          postgres    false                       1255    49743    update_business_avg_rating()    FUNCTION     t  CREATE FUNCTION public.update_business_avg_rating() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE tbl_users
    SET avg_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM tbl_reviews
        WHERE business_id = NEW.business_id AND is_deleted = FALSE AND is_active = TRUE
    )
    WHERE id = NEW.business_id;
    RETURN NULL;
END;
$$;
 3   DROP FUNCTION public.update_business_avg_rating();
       public          postgres    false            �            1259    49860    tbl_ads    TABLE     �  CREATE TABLE public.tbl_ads (
    id bigint NOT NULL,
    title character varying(100) NOT NULL,
    image_url text,
    target_url text,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.tbl_ads;
       public         heap    postgres    false            �            1259    49859    tbl_ads_id_seq    SEQUENCE     w   CREATE SEQUENCE public.tbl_ads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.tbl_ads_id_seq;
       public          postgres    false    246            �           0    0    tbl_ads_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.tbl_ads_id_seq OWNED BY public.tbl_ads.id;
          public          postgres    false    245                       1259    57423    tbl_business_categories    TABLE     N  CREATE TABLE public.tbl_business_categories (
    id bigint NOT NULL,
    category_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 +   DROP TABLE public.tbl_business_categories;
       public         heap    postgres    false                       1259    57422    tbl_business_categories_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_business_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public.tbl_business_categories_id_seq;
       public          postgres    false    260            �           0    0    tbl_business_categories_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public.tbl_business_categories_id_seq OWNED BY public.tbl_business_categories.id;
          public          postgres    false    259                       1259    57434    tbl_business_subcategories    TABLE     r  CREATE TABLE public.tbl_business_subcategories (
    id bigint NOT NULL,
    category_id bigint NOT NULL,
    subcategory_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 .   DROP TABLE public.tbl_business_subcategories;
       public         heap    postgres    false                       1259    57433 !   tbl_business_subcategories_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_business_subcategories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 8   DROP SEQUENCE public.tbl_business_subcategories_id_seq;
       public          postgres    false    262            �           0    0 !   tbl_business_subcategories_id_seq    SEQUENCE OWNED BY     g   ALTER SEQUENCE public.tbl_business_subcategories_id_seq OWNED BY public.tbl_business_subcategories.id;
          public          postgres    false    261            �            1259    32867    tbl_credentials    TABLE       CREATE TABLE public.tbl_credentials (
    id integer NOT NULL,
    key_name character varying(100) NOT NULL,
    value text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
 #   DROP TABLE public.tbl_credentials;
       public         heap    postgres    false            �            1259    32866    tbl_credentials_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.tbl_credentials_id_seq;
       public          postgres    false    214            �           0    0    tbl_credentials_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.tbl_credentials_id_seq OWNED BY public.tbl_credentials.id;
          public          postgres    false    213            �            1259    49652    tbl_delivery_addresses    TABLE     v  CREATE TABLE public.tbl_delivery_addresses (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    address text NOT NULL,
    street character varying(16),
    postal_code character varying(16),
    zone character varying(16),
    latitude character varying(16),
    longitude character varying(16),
    country_code character varying(6),
    phone_number character varying(20),
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 *   DROP TABLE public.tbl_delivery_addresses;
       public         heap    postgres    false            �            1259    49651    tbl_delivery_addresses_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_delivery_addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 4   DROP SEQUENCE public.tbl_delivery_addresses_id_seq;
       public          postgres    false    228            �           0    0    tbl_delivery_addresses_id_seq    SEQUENCE OWNED BY     _   ALTER SEQUENCE public.tbl_delivery_addresses_id_seq OWNED BY public.tbl_delivery_addresses.id;
          public          postgres    false    227            �            1259    32848    tbl_device_info    TABLE     �  CREATE TABLE public.tbl_device_info (
    id bigint NOT NULL,
    user_id bigint,
    device_type character varying(1) NOT NULL,
    device_name character varying(64),
    os_version character varying(8),
    app_version character varying(8),
    ip character varying(45),
    user_token text,
    device_token text,
    timezone character varying(32),
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_device_info_device_type_check CHECK (((device_type)::text = ANY ((ARRAY['A'::character varying, 'I'::character varying, 'W'::character varying])::text[])))
);
 #   DROP TABLE public.tbl_device_info;
       public         heap    postgres    false            �            1259    32847    tbl_device_info_id_seq    SEQUENCE        CREATE SEQUENCE public.tbl_device_info_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.tbl_device_info_id_seq;
       public          postgres    false    212            �           0    0    tbl_device_info_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.tbl_device_info_id_seq OWNED BY public.tbl_device_info.id;
          public          postgres    false    211            �            1259    49195    tbl_membership_plans    TABLE     �  CREATE TABLE public.tbl_membership_plans (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    price numeric(10,2) NOT NULL,
    duration_days integer NOT NULL,
    offer_limit integer,
    visibility_days integer NOT NULL,
    has_free_listing_rplus boolean DEFAULT false,
    has_verified_badge boolean DEFAULT false,
    has_priority_support boolean DEFAULT false,
    has_exclusive_promo_access boolean DEFAULT false,
    has_unlimited_offers boolean DEFAULT false,
    is_auto_renewal boolean DEFAULT true,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 (   DROP TABLE public.tbl_membership_plans;
       public         heap    postgres    false            �            1259    49194    tbl_membership_plans_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_membership_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.tbl_membership_plans_id_seq;
       public          postgres    false    218            �           0    0    tbl_membership_plans_id_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.tbl_membership_plans_id_seq OWNED BY public.tbl_membership_plans.id;
          public          postgres    false    217            �            1259    49788    tbl_notifications    TABLE     �  CREATE TABLE public.tbl_notifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    sender_id bigint,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 %   DROP TABLE public.tbl_notifications;
       public         heap    postgres    false            �            1259    49787    tbl_notifications_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public.tbl_notifications_id_seq;
       public          postgres    false    240            �           0    0    tbl_notifications_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public.tbl_notifications_id_seq OWNED BY public.tbl_notifications.id;
          public          postgres    false    239                        1259    57387    tbl_offer_categories    TABLE     m  CREATE TABLE public.tbl_offer_categories (
    id bigint NOT NULL,
    offer_category_name character varying(128) NOT NULL,
    offer_category_image text,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 (   DROP TABLE public.tbl_offer_categories;
       public         heap    postgres    false            �            1259    57386    tbl_offer_categories_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_offer_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.tbl_offer_categories_id_seq;
       public          postgres    false    256            �           0    0    tbl_offer_categories_id_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.tbl_offer_categories_id_seq OWNED BY public.tbl_offer_categories.id;
          public          postgres    false    255                       1259    57400    tbl_offer_subcategories    TABLE     �  CREATE TABLE public.tbl_offer_subcategories (
    id bigint NOT NULL,
    offer_category_id bigint NOT NULL,
    offer_subcategory_name character varying(128) NOT NULL,
    offer_subcategory_image text,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 +   DROP TABLE public.tbl_offer_subcategories;
       public         heap    postgres    false                       1259    57399    tbl_offer_subcategories_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_offer_subcategories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 5   DROP SEQUENCE public.tbl_offer_subcategories_id_seq;
       public          postgres    false    258            �           0    0    tbl_offer_subcategories_id_seq    SEQUENCE OWNED BY     a   ALTER SEQUENCE public.tbl_offer_subcategories_id_seq OWNED BY public.tbl_offer_subcategories.id;
          public          postgres    false    257            �            1259    49636    tbl_offer_valid_times    TABLE     �  CREATE TABLE public.tbl_offer_valid_times (
    id bigint NOT NULL,
    offer_id bigint NOT NULL,
    valid_time_start time without time zone NOT NULL,
    valid_time_end time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 )   DROP TABLE public.tbl_offer_valid_times;
       public         heap    postgres    false            �            1259    49635    tbl_offer_valid_times_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_offer_valid_times_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 3   DROP SEQUENCE public.tbl_offer_valid_times_id_seq;
       public          postgres    false    226            �           0    0    tbl_offer_valid_times_id_seq    SEQUENCE OWNED BY     ]   ALTER SEQUENCE public.tbl_offer_valid_times_id_seq OWNED BY public.tbl_offer_valid_times.id;
          public          postgres    false    225            �            1259    49598 
   tbl_offers    TABLE     �  CREATE TABLE public.tbl_offers (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    offer_subcategory_id bigint,
    business_subcategory_id bigint,
    image text,
    title character varying(100) NOT NULL,
    subtitle character varying(255),
    description text,
    terms_of_use text,
    discount_percentage numeric(5,2),
    total_price numeric(10,2) NOT NULL,
    old_price numeric(10,2),
    duration integer NOT NULL,
    quantity_available integer NOT NULL,
    quantity_per_user integer DEFAULT 1,
    pin_code character varying(10) NOT NULL,
    is_redeemable_in_store boolean DEFAULT true,
    is_delivery_available boolean DEFAULT false,
    delivery_fee numeric(10,2) DEFAULT 0,
    estimated_delivery_time character varying(50),
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    valid_days character varying(7) DEFAULT '1111111'::character varying,
    offer_latitude character varying(16),
    offer_longitude character varying(16),
    available_branches text,
    is_listed_in_rplus boolean DEFAULT false,
    user_acknowledgment boolean DEFAULT false,
    view_count integer DEFAULT 0,
    total_redemptions integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_offers_total_price_check CHECK ((total_price > (0)::numeric))
);
    DROP TABLE public.tbl_offers;
       public         heap    postgres    false            �            1259    49597    tbl_offers_id_seq    SEQUENCE     z   CREATE SEQUENCE public.tbl_offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.tbl_offers_id_seq;
       public          postgres    false    224            �           0    0    tbl_offers_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.tbl_offers_id_seq OWNED BY public.tbl_offers.id;
          public          postgres    false    223            �            1259    41019    tbl_otp    TABLE     
  CREATE TABLE public.tbl_otp (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    action character varying(10) DEFAULT 'signup'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_otp_action_check CHECK (((action)::text = ANY ((ARRAY['signup'::character varying, 'forgot'::character varying])::text[])))
);
    DROP TABLE public.tbl_otp;
       public         heap    postgres    false            �            1259    41018    tbl_otp_id_seq    SEQUENCE     w   CREATE SEQUENCE public.tbl_otp_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.tbl_otp_id_seq;
       public          postgres    false    216            �           0    0    tbl_otp_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.tbl_otp_id_seq OWNED BY public.tbl_otp.id;
          public          postgres    false    215            �            1259    49212    tbl_payments    TABLE     .  CREATE TABLE public.tbl_payments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    payment_method character varying(50) NOT NULL,
    transaction_id character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying,
    description text,
    payment_type character varying(20) DEFAULT 'other'::character varying,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_payments_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['membership'::character varying, 'listing'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT tbl_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);
     DROP TABLE public.tbl_payments;
       public         heap    postgres    false            �            1259    49211    tbl_payments_id_seq    SEQUENCE     |   CREATE SEQUENCE public.tbl_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.tbl_payments_id_seq;
       public          postgres    false    220            �           0    0    tbl_payments_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.tbl_payments_id_seq OWNED BY public.tbl_payments.id;
          public          postgres    false    219            �            1259    49812    tbl_recently_viewed    TABLE     O  CREATE TABLE public.tbl_recently_viewed (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    offer_id bigint NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 '   DROP TABLE public.tbl_recently_viewed;
       public         heap    postgres    false            �            1259    49811    tbl_recently_viewed_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_recently_viewed_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 1   DROP SEQUENCE public.tbl_recently_viewed_id_seq;
       public          postgres    false    242            �           0    0    tbl_recently_viewed_id_seq    SEQUENCE OWNED BY     Y   ALTER SEQUENCE public.tbl_recently_viewed_id_seq OWNED BY public.tbl_recently_viewed.id;
          public          postgres    false    241            �            1259    49693    tbl_redemption_deliveries    TABLE     �  CREATE TABLE public.tbl_redemption_deliveries (
    id bigint NOT NULL,
    redemption_id bigint NOT NULL,
    delivery_address_id bigint NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0,
    estimated_delivery_time character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    message text,
    rejection_reason text,
    accepted_at timestamp with time zone,
    delivered_at timestamp with time zone,
    CONSTRAINT tbl_redemption_deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'delivered'::character varying])::text[])))
);
 -   DROP TABLE public.tbl_redemption_deliveries;
       public         heap    postgres    false            �            1259    49692     tbl_redemption_deliveries_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_redemption_deliveries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 7   DROP SEQUENCE public.tbl_redemption_deliveries_id_seq;
       public          postgres    false    232            �           0    0     tbl_redemption_deliveries_id_seq    SEQUENCE OWNED BY     e   ALTER SEQUENCE public.tbl_redemption_deliveries_id_seq OWNED BY public.tbl_redemption_deliveries.id;
          public          postgres    false    231            �            1259    49671    tbl_redemptions    TABLE     W  CREATE TABLE public.tbl_redemptions (
    id bigint NOT NULL,
    offer_id bigint NOT NULL,
    user_id bigint NOT NULL,
    redemption_method character varying(20) NOT NULL,
    pin_code character varying(10),
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_redemptions_redemption_method_check CHECK (((redemption_method)::text = ANY ((ARRAY['pin_code'::character varying, 'delivery'::character varying])::text[])))
);
 #   DROP TABLE public.tbl_redemptions;
       public         heap    postgres    false            �            1259    49670    tbl_redemptions_id_seq    SEQUENCE        CREATE SEQUENCE public.tbl_redemptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.tbl_redemptions_id_seq;
       public          postgres    false    230            �           0    0    tbl_redemptions_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.tbl_redemptions_id_seq OWNED BY public.tbl_redemptions.id;
          public          postgres    false    229            �            1259    49873    tbl_report_reasons    TABLE     /  CREATE TABLE public.tbl_report_reasons (
    id bigint NOT NULL,
    report_type character varying(20) NOT NULL,
    reason character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_report_reasons_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['user'::character varying, 'offer'::character varying, 'problem'::character varying])::text[])))
);
 &   DROP TABLE public.tbl_report_reasons;
       public         heap    postgres    false            �            1259    49872    tbl_report_reasons_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_report_reasons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 0   DROP SEQUENCE public.tbl_report_reasons_id_seq;
       public          postgres    false    248            �           0    0    tbl_report_reasons_id_seq    SEQUENCE OWNED BY     W   ALTER SEQUENCE public.tbl_report_reasons_id_seq OWNED BY public.tbl_report_reasons.id;
          public          postgres    false    247            �            1259    49923    tbl_report_voice_notes    TABLE     E  CREATE TABLE public.tbl_report_voice_notes (
    id bigint NOT NULL,
    report_id bigint NOT NULL,
    audio_url text NOT NULL,
    duration_seconds smallint,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_report_voice_notes_duration_seconds_check CHECK ((duration_seconds <= 60))
);
 *   DROP TABLE public.tbl_report_voice_notes;
       public         heap    postgres    false            �            1259    49922    tbl_report_voice_notes_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_report_voice_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 4   DROP SEQUENCE public.tbl_report_voice_notes_id_seq;
       public          postgres    false    252            �           0    0    tbl_report_voice_notes_id_seq    SEQUENCE OWNED BY     _   ALTER SEQUENCE public.tbl_report_voice_notes_id_seq OWNED BY public.tbl_report_voice_notes.id;
          public          postgres    false    251            �            1259    49885    tbl_reports    TABLE       CREATE TABLE public.tbl_reports (
    id bigint NOT NULL,
    ticket_number character varying(20) NOT NULL,
    reporter_id bigint NOT NULL,
    reported_user_id bigint,
    reported_offer_id bigint,
    report_type character varying(20) NOT NULL,
    reason_id bigint NOT NULL,
    additional_details text,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    resolved_at timestamp with time zone,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['user'::character varying, 'offer'::character varying, 'problem'::character varying])::text[]))),
    CONSTRAINT tbl_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);
    DROP TABLE public.tbl_reports;
       public         heap    postgres    false            �            1259    49884    tbl_reports_id_seq    SEQUENCE     {   CREATE SEQUENCE public.tbl_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.tbl_reports_id_seq;
       public          postgres    false    250            �           0    0    tbl_reports_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.tbl_reports_id_seq OWNED BY public.tbl_reports.id;
          public          postgres    false    249            �            1259    49715    tbl_reviews    TABLE     �  CREATE TABLE public.tbl_reviews (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    business_id bigint NOT NULL,
    offer_id bigint,
    rating integer NOT NULL,
    review text,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tbl_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);
    DROP TABLE public.tbl_reviews;
       public         heap    postgres    false            �            1259    49714    tbl_reviews_id_seq    SEQUENCE     {   CREATE SEQUENCE public.tbl_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.tbl_reviews_id_seq;
       public          postgres    false    234            �           0    0    tbl_reviews_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.tbl_reviews_id_seq OWNED BY public.tbl_reviews.id;
          public          postgres    false    233            �            1259    49767    tbl_saved_offers    TABLE     L  CREATE TABLE public.tbl_saved_offers (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    offer_id bigint NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 $   DROP TABLE public.tbl_saved_offers;
       public         heap    postgres    false            �            1259    49766    tbl_saved_offers_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_saved_offers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.tbl_saved_offers_id_seq;
       public          postgres    false    238            �           0    0    tbl_saved_offers_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.tbl_saved_offers_id_seq OWNED BY public.tbl_saved_offers.id;
          public          postgres    false    237            �            1259    49939    tbl_static_pages    TABLE     ^  CREATE TABLE public.tbl_static_pages (
    id bigint NOT NULL,
    page_key character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 $   DROP TABLE public.tbl_static_pages;
       public         heap    postgres    false            �            1259    49938    tbl_static_pages_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_static_pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.tbl_static_pages_id_seq;
       public          postgres    false    254            �           0    0    tbl_static_pages_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.tbl_static_pages_id_seq OWNED BY public.tbl_static_pages.id;
          public          postgres    false    253            �            1259    49237    tbl_user_memberships    TABLE     �  CREATE TABLE public.tbl_user_memberships (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    plan_id bigint NOT NULL,
    payment_id bigint,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    offers_used integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 (   DROP TABLE public.tbl_user_memberships;
       public         heap    postgres    false            �            1259    49236    tbl_user_memberships_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_user_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.tbl_user_memberships_id_seq;
       public          postgres    false    222                        0    0    tbl_user_memberships_id_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.tbl_user_memberships_id_seq OWNED BY public.tbl_user_memberships.id;
          public          postgres    false    221            �            1259    49833    tbl_user_settings    TABLE     �  CREATE TABLE public.tbl_user_settings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    notification_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true,
    vibrate_enabled boolean DEFAULT true,
    app_updates_enabled boolean DEFAULT true,
    delivery_status_enabled boolean DEFAULT true,
    subscribers_notification_enabled boolean DEFAULT true,
    redeemed_offers_notification_enabled boolean DEFAULT true,
    delivery_request_notification_enabled boolean DEFAULT true,
    new_service_notification_enabled boolean DEFAULT true,
    new_tips_notification_enabled boolean DEFAULT true,
    language character varying(10) DEFAULT 'en'::character varying,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
 %   DROP TABLE public.tbl_user_settings;
       public         heap    postgres    false            �            1259    49832    tbl_user_settings_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_user_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 /   DROP SEQUENCE public.tbl_user_settings_id_seq;
       public          postgres    false    244                       0    0    tbl_user_settings_id_seq    SEQUENCE OWNED BY     U   ALTER SEQUENCE public.tbl_user_settings_id_seq OWNED BY public.tbl_user_settings.id;
          public          postgres    false    243            �            1259    49746    tbl_user_subscriptions    TABLE     ~  CREATE TABLE public.tbl_user_subscriptions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    business_id bigint NOT NULL,
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);
 *   DROP TABLE public.tbl_user_subscriptions;
       public         heap    postgres    false            �            1259    49745    tbl_user_subscriptions_id_seq    SEQUENCE     �   CREATE SEQUENCE public.tbl_user_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 4   DROP SEQUENCE public.tbl_user_subscriptions_id_seq;
       public          postgres    false    236                       0    0    tbl_user_subscriptions_id_seq    SEQUENCE OWNED BY     _   ALTER SEQUENCE public.tbl_user_subscriptions_id_seq OWNED BY public.tbl_user_subscriptions.id;
          public          postgres    false    235            �            1259    32822 	   tbl_users    TABLE     M  CREATE TABLE public.tbl_users (
    id bigint NOT NULL,
    username character varying(32),
    email character varying(255),
    password text,
    phone character varying(20),
    country_code character varying(6),
    dob date,
    social_id character varying(255),
    step integer DEFAULT 1,
    account_type character varying(20),
    signup_type character varying(20),
    profile_image text,
    is_verified boolean DEFAULT false,
    business_subcategory_id bigint,
    instagram_url text,
    tiktok_url text,
    whatsapp_url text,
    map_url text,
    business_address text,
    street character varying(16),
    postal_code character varying(16),
    zone character varying(16),
    latitude character varying(16),
    longitude character varying(16),
    is_active boolean DEFAULT true,
    is_deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    avg_rating numeric,
    CONSTRAINT tbl_users_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['individual'::character varying, 'business'::character varying])::text[]))),
    CONSTRAINT tbl_users_login_type_check CHECK (((signup_type)::text = ANY ((ARRAY['s'::character varying, 'g'::character varying, 'a'::character varying, 'f'::character varying])::text[])))
);
    DROP TABLE public.tbl_users;
       public         heap    postgres    false            �            1259    32821    tbl_users_id_seq    SEQUENCE     y   CREATE SEQUENCE public.tbl_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.tbl_users_id_seq;
       public          postgres    false    210                       0    0    tbl_users_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.tbl_users_id_seq OWNED BY public.tbl_users.id;
          public          postgres    false    209            �           2604    49863 
   tbl_ads id    DEFAULT     h   ALTER TABLE ONLY public.tbl_ads ALTER COLUMN id SET DEFAULT nextval('public.tbl_ads_id_seq'::regclass);
 9   ALTER TABLE public.tbl_ads ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    245    246    246            �           2604    57426    tbl_business_categories id    DEFAULT     �   ALTER TABLE ONLY public.tbl_business_categories ALTER COLUMN id SET DEFAULT nextval('public.tbl_business_categories_id_seq'::regclass);
 I   ALTER TABLE public.tbl_business_categories ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    259    260    260            �           2604    57437    tbl_business_subcategories id    DEFAULT     �   ALTER TABLE ONLY public.tbl_business_subcategories ALTER COLUMN id SET DEFAULT nextval('public.tbl_business_subcategories_id_seq'::regclass);
 L   ALTER TABLE public.tbl_business_subcategories ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    262    261    262                       2604    32870    tbl_credentials id    DEFAULT     x   ALTER TABLE ONLY public.tbl_credentials ALTER COLUMN id SET DEFAULT nextval('public.tbl_credentials_id_seq'::regclass);
 A   ALTER TABLE public.tbl_credentials ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    214    213    214            Q           2604    49655    tbl_delivery_addresses id    DEFAULT     �   ALTER TABLE ONLY public.tbl_delivery_addresses ALTER COLUMN id SET DEFAULT nextval('public.tbl_delivery_addresses_id_seq'::regclass);
 H   ALTER TABLE public.tbl_delivery_addresses ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    228    227    228                       2604    32851    tbl_device_info id    DEFAULT     x   ALTER TABLE ONLY public.tbl_device_info ALTER COLUMN id SET DEFAULT nextval('public.tbl_device_info_id_seq'::regclass);
 A   ALTER TABLE public.tbl_device_info ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    212    211    212            "           2604    49198    tbl_membership_plans id    DEFAULT     �   ALTER TABLE ONLY public.tbl_membership_plans ALTER COLUMN id SET DEFAULT nextval('public.tbl_membership_plans_id_seq'::regclass);
 F   ALTER TABLE public.tbl_membership_plans ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    217    218    218            q           2604    49791    tbl_notifications id    DEFAULT     |   ALTER TABLE ONLY public.tbl_notifications ALTER COLUMN id SET DEFAULT nextval('public.tbl_notifications_id_seq'::regclass);
 C   ALTER TABLE public.tbl_notifications ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    239    240    240            �           2604    57390    tbl_offer_categories id    DEFAULT     �   ALTER TABLE ONLY public.tbl_offer_categories ALTER COLUMN id SET DEFAULT nextval('public.tbl_offer_categories_id_seq'::regclass);
 F   ALTER TABLE public.tbl_offer_categories ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    255    256    256            �           2604    57403    tbl_offer_subcategories id    DEFAULT     �   ALTER TABLE ONLY public.tbl_offer_subcategories ALTER COLUMN id SET DEFAULT nextval('public.tbl_offer_subcategories_id_seq'::regclass);
 I   ALTER TABLE public.tbl_offer_subcategories ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    257    258    258            L           2604    49639    tbl_offer_valid_times id    DEFAULT     �   ALTER TABLE ONLY public.tbl_offer_valid_times ALTER COLUMN id SET DEFAULT nextval('public.tbl_offer_valid_times_id_seq'::regclass);
 G   ALTER TABLE public.tbl_offer_valid_times ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    226    225    226            =           2604    49601    tbl_offers id    DEFAULT     n   ALTER TABLE ONLY public.tbl_offers ALTER COLUMN id SET DEFAULT nextval('public.tbl_offers_id_seq'::regclass);
 <   ALTER TABLE public.tbl_offers ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    224    223    224                       2604    41022 
   tbl_otp id    DEFAULT     h   ALTER TABLE ONLY public.tbl_otp ALTER COLUMN id SET DEFAULT nextval('public.tbl_otp_id_seq'::regclass);
 9   ALTER TABLE public.tbl_otp ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    215    216    216            -           2604    49215    tbl_payments id    DEFAULT     r   ALTER TABLE ONLY public.tbl_payments ALTER COLUMN id SET DEFAULT nextval('public.tbl_payments_id_seq'::regclass);
 >   ALTER TABLE public.tbl_payments ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    219    220    220            w           2604    49815    tbl_recently_viewed id    DEFAULT     �   ALTER TABLE ONLY public.tbl_recently_viewed ALTER COLUMN id SET DEFAULT nextval('public.tbl_recently_viewed_id_seq'::regclass);
 E   ALTER TABLE public.tbl_recently_viewed ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    241    242    242            ]           2604    49696    tbl_redemption_deliveries id    DEFAULT     �   ALTER TABLE ONLY public.tbl_redemption_deliveries ALTER COLUMN id SET DEFAULT nextval('public.tbl_redemption_deliveries_id_seq'::regclass);
 K   ALTER TABLE public.tbl_redemption_deliveries ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    232    231    232            W           2604    49674    tbl_redemptions id    DEFAULT     x   ALTER TABLE ONLY public.tbl_redemptions ALTER COLUMN id SET DEFAULT nextval('public.tbl_redemptions_id_seq'::regclass);
 A   ALTER TABLE public.tbl_redemptions ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    229    230    230            �           2604    49876    tbl_report_reasons id    DEFAULT     ~   ALTER TABLE ONLY public.tbl_report_reasons ALTER COLUMN id SET DEFAULT nextval('public.tbl_report_reasons_id_seq'::regclass);
 D   ALTER TABLE public.tbl_report_reasons ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    247    248    248            �           2604    49926    tbl_report_voice_notes id    DEFAULT     �   ALTER TABLE ONLY public.tbl_report_voice_notes ALTER COLUMN id SET DEFAULT nextval('public.tbl_report_voice_notes_id_seq'::regclass);
 H   ALTER TABLE public.tbl_report_voice_notes ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    251    252    252            �           2604    49888    tbl_reports id    DEFAULT     p   ALTER TABLE ONLY public.tbl_reports ALTER COLUMN id SET DEFAULT nextval('public.tbl_reports_id_seq'::regclass);
 =   ALTER TABLE public.tbl_reports ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    249    250    250            a           2604    49718    tbl_reviews id    DEFAULT     p   ALTER TABLE ONLY public.tbl_reviews ALTER COLUMN id SET DEFAULT nextval('public.tbl_reviews_id_seq'::regclass);
 =   ALTER TABLE public.tbl_reviews ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    234    233    234            l           2604    49770    tbl_saved_offers id    DEFAULT     z   ALTER TABLE ONLY public.tbl_saved_offers ALTER COLUMN id SET DEFAULT nextval('public.tbl_saved_offers_id_seq'::regclass);
 B   ALTER TABLE public.tbl_saved_offers ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    237    238    238            �           2604    49942    tbl_static_pages id    DEFAULT     z   ALTER TABLE ONLY public.tbl_static_pages ALTER COLUMN id SET DEFAULT nextval('public.tbl_static_pages_id_seq'::regclass);
 B   ALTER TABLE public.tbl_static_pages ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    254    253    254            7           2604    49240    tbl_user_memberships id    DEFAULT     �   ALTER TABLE ONLY public.tbl_user_memberships ALTER COLUMN id SET DEFAULT nextval('public.tbl_user_memberships_id_seq'::regclass);
 F   ALTER TABLE public.tbl_user_memberships ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    222    221    222            |           2604    49836    tbl_user_settings id    DEFAULT     |   ALTER TABLE ONLY public.tbl_user_settings ALTER COLUMN id SET DEFAULT nextval('public.tbl_user_settings_id_seq'::regclass);
 C   ALTER TABLE public.tbl_user_settings ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    244    243    244            g           2604    49749    tbl_user_subscriptions id    DEFAULT     �   ALTER TABLE ONLY public.tbl_user_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.tbl_user_subscriptions_id_seq'::regclass);
 H   ALTER TABLE public.tbl_user_subscriptions ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    235    236    236                       2604    32825    tbl_users id    DEFAULT     l   ALTER TABLE ONLY public.tbl_users ALTER COLUMN id SET DEFAULT nextval('public.tbl_users_id_seq'::regclass);
 ;   ALTER TABLE public.tbl_users ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    210    209    210            �          0    49860    tbl_ads 
   TABLE DATA           �   COPY public.tbl_ads (id, title, image_url, target_url, is_active, is_deleted, start_date, end_date, created_at, updated_at) FROM stdin;
    public          postgres    false    246   g      �          0    57423    tbl_business_categories 
   TABLE DATA           s   COPY public.tbl_business_categories (id, category_name, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    260   Ch      �          0    57434    tbl_business_subcategories 
   TABLE DATA           �   COPY public.tbl_business_subcategories (id, category_id, subcategory_name, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    262   �i      �          0    32867    tbl_credentials 
   TABLE DATA           V   COPY public.tbl_credentials (id, key_name, value, created_at, updated_at) FROM stdin;
    public          postgres    false    214   �n      �          0    49652    tbl_delivery_addresses 
   TABLE DATA           �   COPY public.tbl_delivery_addresses (id, user_id, address, street, postal_code, zone, latitude, longitude, country_code, phone_number, is_default, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    228   �o      �          0    32848    tbl_device_info 
   TABLE DATA           �   COPY public.tbl_device_info (id, user_id, device_type, device_name, os_version, app_version, ip, user_token, device_token, timezone, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    212   �p      �          0    49195    tbl_membership_plans 
   TABLE DATA              COPY public.tbl_membership_plans (id, name, price, duration_days, offer_limit, visibility_days, has_free_listing_rplus, has_verified_badge, has_priority_support, has_exclusive_promo_access, has_unlimited_offers, is_auto_renewal, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    218   �t      �          0    49788    tbl_notifications 
   TABLE DATA           �   COPY public.tbl_notifications (id, user_id, sender_id, type, title, message, data, is_read, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    240   u      �          0    57387    tbl_offer_categories 
   TABLE DATA           �   COPY public.tbl_offer_categories (id, offer_category_name, offer_category_image, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    256   9u      �          0    57400    tbl_offer_subcategories 
   TABLE DATA           �   COPY public.tbl_offer_subcategories (id, offer_category_id, offer_subcategory_name, offer_subcategory_image, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    258   �u      �          0    49636    tbl_offer_valid_times 
   TABLE DATA           �   COPY public.tbl_offer_valid_times (id, offer_id, valid_time_start, valid_time_end, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    226   cv      �          0    49598 
   tbl_offers 
   TABLE DATA             COPY public.tbl_offers (id, user_id, offer_subcategory_id, business_subcategory_id, image, title, subtitle, description, terms_of_use, discount_percentage, total_price, old_price, duration, quantity_available, quantity_per_user, pin_code, is_redeemable_in_store, is_delivery_available, delivery_fee, estimated_delivery_time, start_date, end_date, valid_days, offer_latitude, offer_longitude, available_branches, is_listed_in_rplus, user_acknowledgment, view_count, total_redemptions, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    224   w      �          0    41019    tbl_otp 
   TABLE DATA           _   COPY public.tbl_otp (id, user_id, otp, expires_at, action, created_at, updated_at) FROM stdin;
    public          postgres    false    216   �x      �          0    49212    tbl_payments 
   TABLE DATA           �   COPY public.tbl_payments (id, user_id, amount, currency, payment_method, transaction_id, status, description, payment_type, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    220   z      �          0    49812    tbl_recently_viewed 
   TABLE DATA           s   COPY public.tbl_recently_viewed (id, user_id, offer_id, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    242   �z      �          0    49693    tbl_redemption_deliveries 
   TABLE DATA           �   COPY public.tbl_redemption_deliveries (id, redemption_id, delivery_address_id, delivery_fee, estimated_delivery_time, status, message, rejection_reason, accepted_at, delivered_at) FROM stdin;
    public          postgres    false    232   �z      �          0    49671    tbl_redemptions 
   TABLE DATA           �   COPY public.tbl_redemptions (id, offer_id, user_id, redemption_method, pin_code, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    230   �z      �          0    49873    tbl_report_reasons 
   TABLE DATA           t   COPY public.tbl_report_reasons (id, report_type, reason, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    248   {      �          0    49923    tbl_report_voice_notes 
   TABLE DATA           i   COPY public.tbl_report_voice_notes (id, report_id, audio_url, duration_seconds, uploaded_at) FROM stdin;
    public          postgres    false    252   �{      �          0    49885    tbl_reports 
   TABLE DATA           �   COPY public.tbl_reports (id, ticket_number, reporter_id, reported_user_id, reported_offer_id, report_type, reason_id, additional_details, status, admin_notes, resolved_at, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    250   d|      �          0    49715    tbl_reviews 
   TABLE DATA           �   COPY public.tbl_reviews (id, user_id, business_id, offer_id, rating, review, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    234   �|      �          0    49767    tbl_saved_offers 
   TABLE DATA           p   COPY public.tbl_saved_offers (id, user_id, offer_id, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    238   �|      �          0    49939    tbl_static_pages 
   TABLE DATA           k   COPY public.tbl_static_pages (id, page_key, title, content, is_active, created_at, updated_at) FROM stdin;
    public          postgres    false    254   }      �          0    49237    tbl_user_memberships 
   TABLE DATA           �   COPY public.tbl_user_memberships (id, user_id, plan_id, payment_id, start_date, end_date, offers_used, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    222   |~      �          0    49833    tbl_user_settings 
   TABLE DATA           �  COPY public.tbl_user_settings (id, user_id, notification_enabled, sound_enabled, vibrate_enabled, app_updates_enabled, delivery_status_enabled, subscribers_notification_enabled, redeemed_offers_notification_enabled, delivery_request_notification_enabled, new_service_notification_enabled, new_tips_notification_enabled, language, is_active, is_deleted, created_at, updated_at) FROM stdin;
    public          postgres    false    244   �      �          0    49746    tbl_user_subscriptions 
   TABLE DATA           �   COPY public.tbl_user_subscriptions (id, user_id, business_id, is_active, is_deleted, created_at, updated_at, deleted_at) FROM stdin;
    public          postgres    false    236   �      �          0    32822 	   tbl_users 
   TABLE DATA           l  COPY public.tbl_users (id, username, email, password, phone, country_code, dob, social_id, step, account_type, signup_type, profile_image, is_verified, business_subcategory_id, instagram_url, tiktok_url, whatsapp_url, map_url, business_address, street, postal_code, zone, latitude, longitude, is_active, is_deleted, created_at, updated_at, avg_rating) FROM stdin;
    public          postgres    false    210   !�                 0    0    tbl_ads_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.tbl_ads_id_seq', 10, true);
          public          postgres    false    245                       0    0    tbl_business_categories_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public.tbl_business_categories_id_seq', 16, true);
          public          postgres    false    259                       0    0 !   tbl_business_subcategories_id_seq    SEQUENCE SET     P   SELECT pg_catalog.setval('public.tbl_business_subcategories_id_seq', 89, true);
          public          postgres    false    261                       0    0    tbl_credentials_id_seq    SEQUENCE SET     D   SELECT pg_catalog.setval('public.tbl_credentials_id_seq', 6, true);
          public          postgres    false    213                       0    0    tbl_delivery_addresses_id_seq    SEQUENCE SET     L   SELECT pg_catalog.setval('public.tbl_delivery_addresses_id_seq', 10, true);
          public          postgres    false    227            	           0    0    tbl_device_info_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.tbl_device_info_id_seq', 14, true);
          public          postgres    false    211            
           0    0    tbl_membership_plans_id_seq    SEQUENCE SET     I   SELECT pg_catalog.setval('public.tbl_membership_plans_id_seq', 3, true);
          public          postgres    false    217                       0    0    tbl_notifications_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public.tbl_notifications_id_seq', 10, true);
          public          postgres    false    239                       0    0    tbl_offer_categories_id_seq    SEQUENCE SET     I   SELECT pg_catalog.setval('public.tbl_offer_categories_id_seq', 2, true);
          public          postgres    false    255                       0    0    tbl_offer_subcategories_id_seq    SEQUENCE SET     M   SELECT pg_catalog.setval('public.tbl_offer_subcategories_id_seq', 12, true);
          public          postgres    false    257                       0    0    tbl_offer_valid_times_id_seq    SEQUENCE SET     K   SELECT pg_catalog.setval('public.tbl_offer_valid_times_id_seq', 22, true);
          public          postgres    false    225                       0    0    tbl_offers_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public.tbl_offers_id_seq', 16, true);
          public          postgres    false    223                       0    0    tbl_otp_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.tbl_otp_id_seq', 36, true);
          public          postgres    false    215                       0    0    tbl_payments_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public.tbl_payments_id_seq', 40, true);
          public          postgres    false    219                       0    0    tbl_recently_viewed_id_seq    SEQUENCE SET     I   SELECT pg_catalog.setval('public.tbl_recently_viewed_id_seq', 10, true);
          public          postgres    false    241                       0    0     tbl_redemption_deliveries_id_seq    SEQUENCE SET     O   SELECT pg_catalog.setval('public.tbl_redemption_deliveries_id_seq', 10, true);
          public          postgres    false    231                       0    0    tbl_redemptions_id_seq    SEQUENCE SET     E   SELECT pg_catalog.setval('public.tbl_redemptions_id_seq', 10, true);
          public          postgres    false    229                       0    0    tbl_report_reasons_id_seq    SEQUENCE SET     H   SELECT pg_catalog.setval('public.tbl_report_reasons_id_seq', 10, true);
          public          postgres    false    247                       0    0    tbl_report_voice_notes_id_seq    SEQUENCE SET     L   SELECT pg_catalog.setval('public.tbl_report_voice_notes_id_seq', 10, true);
          public          postgres    false    251                       0    0    tbl_reports_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.tbl_reports_id_seq', 10, true);
          public          postgres    false    249                       0    0    tbl_reviews_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.tbl_reviews_id_seq', 20, true);
          public          postgres    false    233                       0    0    tbl_saved_offers_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public.tbl_saved_offers_id_seq', 10, true);
          public          postgres    false    237                       0    0    tbl_static_pages_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public.tbl_static_pages_id_seq', 10, true);
          public          postgres    false    253                       0    0    tbl_user_memberships_id_seq    SEQUENCE SET     J   SELECT pg_catalog.setval('public.tbl_user_memberships_id_seq', 37, true);
          public          postgres    false    221                       0    0    tbl_user_settings_id_seq    SEQUENCE SET     G   SELECT pg_catalog.setval('public.tbl_user_settings_id_seq', 10, true);
          public          postgres    false    243                       0    0    tbl_user_subscriptions_id_seq    SEQUENCE SET     K   SELECT pg_catalog.setval('public.tbl_user_subscriptions_id_seq', 1, true);
          public          postgres    false    235                       0    0    tbl_users_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.tbl_users_id_seq', 16, true);
          public          postgres    false    209            �           2606    49871    tbl_ads tbl_ads_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.tbl_ads
    ADD CONSTRAINT tbl_ads_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.tbl_ads DROP CONSTRAINT tbl_ads_pkey;
       public            postgres    false    246            �           2606    57432 4   tbl_business_categories tbl_business_categories_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public.tbl_business_categories
    ADD CONSTRAINT tbl_business_categories_pkey PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public.tbl_business_categories DROP CONSTRAINT tbl_business_categories_pkey;
       public            postgres    false    260            �           2606    57443 :   tbl_business_subcategories tbl_business_subcategories_pkey 
   CONSTRAINT     x   ALTER TABLE ONLY public.tbl_business_subcategories
    ADD CONSTRAINT tbl_business_subcategories_pkey PRIMARY KEY (id);
 d   ALTER TABLE ONLY public.tbl_business_subcategories DROP CONSTRAINT tbl_business_subcategories_pkey;
       public            postgres    false    262            �           2606    32878 ,   tbl_credentials tbl_credentials_key_name_key 
   CONSTRAINT     k   ALTER TABLE ONLY public.tbl_credentials
    ADD CONSTRAINT tbl_credentials_key_name_key UNIQUE (key_name);
 V   ALTER TABLE ONLY public.tbl_credentials DROP CONSTRAINT tbl_credentials_key_name_key;
       public            postgres    false    214            �           2606    32876 $   tbl_credentials tbl_credentials_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.tbl_credentials
    ADD CONSTRAINT tbl_credentials_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.tbl_credentials DROP CONSTRAINT tbl_credentials_pkey;
       public            postgres    false    214            �           2606    49664 2   tbl_delivery_addresses tbl_delivery_addresses_pkey 
   CONSTRAINT     p   ALTER TABLE ONLY public.tbl_delivery_addresses
    ADD CONSTRAINT tbl_delivery_addresses_pkey PRIMARY KEY (id);
 \   ALTER TABLE ONLY public.tbl_delivery_addresses DROP CONSTRAINT tbl_delivery_addresses_pkey;
       public            postgres    false    228            �           2606    32860 $   tbl_device_info tbl_device_info_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.tbl_device_info
    ADD CONSTRAINT tbl_device_info_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.tbl_device_info DROP CONSTRAINT tbl_device_info_pkey;
       public            postgres    false    212            �           2606    49210 .   tbl_membership_plans tbl_membership_plans_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.tbl_membership_plans
    ADD CONSTRAINT tbl_membership_plans_pkey PRIMARY KEY (id);
 X   ALTER TABLE ONLY public.tbl_membership_plans DROP CONSTRAINT tbl_membership_plans_pkey;
       public            postgres    false    218            �           2606    49800 (   tbl_notifications tbl_notifications_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.tbl_notifications
    ADD CONSTRAINT tbl_notifications_pkey PRIMARY KEY (id);
 R   ALTER TABLE ONLY public.tbl_notifications DROP CONSTRAINT tbl_notifications_pkey;
       public            postgres    false    240            �           2606    57398 .   tbl_offer_categories tbl_offer_categories_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.tbl_offer_categories
    ADD CONSTRAINT tbl_offer_categories_pkey PRIMARY KEY (id);
 X   ALTER TABLE ONLY public.tbl_offer_categories DROP CONSTRAINT tbl_offer_categories_pkey;
       public            postgres    false    256            �           2606    57411 4   tbl_offer_subcategories tbl_offer_subcategories_pkey 
   CONSTRAINT     r   ALTER TABLE ONLY public.tbl_offer_subcategories
    ADD CONSTRAINT tbl_offer_subcategories_pkey PRIMARY KEY (id);
 ^   ALTER TABLE ONLY public.tbl_offer_subcategories DROP CONSTRAINT tbl_offer_subcategories_pkey;
       public            postgres    false    258            �           2606    49645 0   tbl_offer_valid_times tbl_offer_valid_times_pkey 
   CONSTRAINT     n   ALTER TABLE ONLY public.tbl_offer_valid_times
    ADD CONSTRAINT tbl_offer_valid_times_pkey PRIMARY KEY (id);
 Z   ALTER TABLE ONLY public.tbl_offer_valid_times DROP CONSTRAINT tbl_offer_valid_times_pkey;
       public            postgres    false    226            �           2606    49619    tbl_offers tbl_offers_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.tbl_offers
    ADD CONSTRAINT tbl_offers_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.tbl_offers DROP CONSTRAINT tbl_offers_pkey;
       public            postgres    false    224            �           2606    41028    tbl_otp tbl_otp_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.tbl_otp
    ADD CONSTRAINT tbl_otp_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.tbl_otp DROP CONSTRAINT tbl_otp_pkey;
       public            postgres    false    216            �           2606    41030 "   tbl_otp tbl_otp_user_id_action_key 
   CONSTRAINT     h   ALTER TABLE ONLY public.tbl_otp
    ADD CONSTRAINT tbl_otp_user_id_action_key UNIQUE (user_id, action);
 L   ALTER TABLE ONLY public.tbl_otp DROP CONSTRAINT tbl_otp_user_id_action_key;
       public            postgres    false    216    216            �           2606    49228    tbl_payments tbl_payments_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.tbl_payments
    ADD CONSTRAINT tbl_payments_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.tbl_payments DROP CONSTRAINT tbl_payments_pkey;
       public            postgres    false    220            �           2606    49230 ,   tbl_payments tbl_payments_transaction_id_key 
   CONSTRAINT     q   ALTER TABLE ONLY public.tbl_payments
    ADD CONSTRAINT tbl_payments_transaction_id_key UNIQUE (transaction_id);
 V   ALTER TABLE ONLY public.tbl_payments DROP CONSTRAINT tbl_payments_transaction_id_key;
       public            postgres    false    220            �           2606    49821 ,   tbl_recently_viewed tbl_recently_viewed_pkey 
   CONSTRAINT     j   ALTER TABLE ONLY public.tbl_recently_viewed
    ADD CONSTRAINT tbl_recently_viewed_pkey PRIMARY KEY (id);
 V   ALTER TABLE ONLY public.tbl_recently_viewed DROP CONSTRAINT tbl_recently_viewed_pkey;
       public            postgres    false    242            �           2606    49703 8   tbl_redemption_deliveries tbl_redemption_deliveries_pkey 
   CONSTRAINT     v   ALTER TABLE ONLY public.tbl_redemption_deliveries
    ADD CONSTRAINT tbl_redemption_deliveries_pkey PRIMARY KEY (id);
 b   ALTER TABLE ONLY public.tbl_redemption_deliveries DROP CONSTRAINT tbl_redemption_deliveries_pkey;
       public            postgres    false    232            �           2606    49681 $   tbl_redemptions tbl_redemptions_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.tbl_redemptions
    ADD CONSTRAINT tbl_redemptions_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.tbl_redemptions DROP CONSTRAINT tbl_redemptions_pkey;
       public            postgres    false    230            �           2606    49883 *   tbl_report_reasons tbl_report_reasons_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public.tbl_report_reasons
    ADD CONSTRAINT tbl_report_reasons_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public.tbl_report_reasons DROP CONSTRAINT tbl_report_reasons_pkey;
       public            postgres    false    248            �           2606    49932 2   tbl_report_voice_notes tbl_report_voice_notes_pkey 
   CONSTRAINT     p   ALTER TABLE ONLY public.tbl_report_voice_notes
    ADD CONSTRAINT tbl_report_voice_notes_pkey PRIMARY KEY (id);
 \   ALTER TABLE ONLY public.tbl_report_voice_notes DROP CONSTRAINT tbl_report_voice_notes_pkey;
       public            postgres    false    252            �           2606    49899    tbl_reports tbl_reports_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_pkey;
       public            postgres    false    250            �           2606    49901 )   tbl_reports tbl_reports_ticket_number_key 
   CONSTRAINT     m   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_ticket_number_key UNIQUE (ticket_number);
 S   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_ticket_number_key;
       public            postgres    false    250            �           2606    49727    tbl_reviews tbl_reviews_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.tbl_reviews
    ADD CONSTRAINT tbl_reviews_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.tbl_reviews DROP CONSTRAINT tbl_reviews_pkey;
       public            postgres    false    234            �           2606    49776 &   tbl_saved_offers tbl_saved_offers_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public.tbl_saved_offers
    ADD CONSTRAINT tbl_saved_offers_pkey PRIMARY KEY (id);
 P   ALTER TABLE ONLY public.tbl_saved_offers DROP CONSTRAINT tbl_saved_offers_pkey;
       public            postgres    false    238            �           2606    49951 .   tbl_static_pages tbl_static_pages_page_key_key 
   CONSTRAINT     m   ALTER TABLE ONLY public.tbl_static_pages
    ADD CONSTRAINT tbl_static_pages_page_key_key UNIQUE (page_key);
 X   ALTER TABLE ONLY public.tbl_static_pages DROP CONSTRAINT tbl_static_pages_page_key_key;
       public            postgres    false    254            �           2606    49949 &   tbl_static_pages tbl_static_pages_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public.tbl_static_pages
    ADD CONSTRAINT tbl_static_pages_pkey PRIMARY KEY (id);
 P   ALTER TABLE ONLY public.tbl_static_pages DROP CONSTRAINT tbl_static_pages_pkey;
       public            postgres    false    254            �           2606    49247 .   tbl_user_memberships tbl_user_memberships_pkey 
   CONSTRAINT     l   ALTER TABLE ONLY public.tbl_user_memberships
    ADD CONSTRAINT tbl_user_memberships_pkey PRIMARY KEY (id);
 X   ALTER TABLE ONLY public.tbl_user_memberships DROP CONSTRAINT tbl_user_memberships_pkey;
       public            postgres    false    222            �           2606    49853 (   tbl_user_settings tbl_user_settings_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.tbl_user_settings
    ADD CONSTRAINT tbl_user_settings_pkey PRIMARY KEY (id);
 R   ALTER TABLE ONLY public.tbl_user_settings DROP CONSTRAINT tbl_user_settings_pkey;
       public            postgres    false    244            �           2606    49755 2   tbl_user_subscriptions tbl_user_subscriptions_pkey 
   CONSTRAINT     p   ALTER TABLE ONLY public.tbl_user_subscriptions
    ADD CONSTRAINT tbl_user_subscriptions_pkey PRIMARY KEY (id);
 \   ALTER TABLE ONLY public.tbl_user_subscriptions DROP CONSTRAINT tbl_user_subscriptions_pkey;
       public            postgres    false    236            �           2606    32841    tbl_users tbl_users_email_key 
   CONSTRAINT     Y   ALTER TABLE ONLY public.tbl_users
    ADD CONSTRAINT tbl_users_email_key UNIQUE (email);
 G   ALTER TABLE ONLY public.tbl_users DROP CONSTRAINT tbl_users_email_key;
       public            postgres    false    210            �           2606    32837    tbl_users tbl_users_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.tbl_users
    ADD CONSTRAINT tbl_users_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.tbl_users DROP CONSTRAINT tbl_users_pkey;
       public            postgres    false    210            �           2606    32839     tbl_users tbl_users_username_key 
   CONSTRAINT     _   ALTER TABLE ONLY public.tbl_users
    ADD CONSTRAINT tbl_users_username_key UNIQUE (username);
 J   ALTER TABLE ONLY public.tbl_users DROP CONSTRAINT tbl_users_username_key;
       public            postgres    false    210            !           2620    49744 !   tbl_reviews trg_update_avg_rating    TRIGGER     �   CREATE TRIGGER trg_update_avg_rating AFTER INSERT OR DELETE OR UPDATE ON public.tbl_reviews FOR EACH ROW EXECUTE FUNCTION public.update_business_avg_rating();
 :   DROP TRIGGER trg_update_avg_rating ON public.tbl_reviews;
       public          postgres    false    263    234                       2606    57449 "   tbl_offers business_subcategory_id    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_offers
    ADD CONSTRAINT business_subcategory_id FOREIGN KEY (business_subcategory_id) REFERENCES public.tbl_business_subcategories(id) NOT VALID;
 L   ALTER TABLE ONLY public.tbl_offers DROP CONSTRAINT business_subcategory_id;
       public          postgres    false    3581    262    224            �           2606    57454 &   tbl_users business_subcategory_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_users
    ADD CONSTRAINT business_subcategory_id_fkey FOREIGN KEY (business_subcategory_id) REFERENCES public.tbl_business_subcategories(id) NOT VALID;
 P   ALTER TABLE ONLY public.tbl_users DROP CONSTRAINT business_subcategory_id_fkey;
       public          postgres    false    3581    210    262                       2606    57417 &   tbl_offers offer_subcategories_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_offers
    ADD CONSTRAINT offer_subcategories_id_fkey FOREIGN KEY (offer_subcategory_id) REFERENCES public.tbl_offer_subcategories(id) NOT VALID;
 P   ALTER TABLE ONLY public.tbl_offers DROP CONSTRAINT offer_subcategories_id_fkey;
       public          postgres    false    224    3577    258                        2606    57444 F   tbl_business_subcategories tbl_business_subcategories_category_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_business_subcategories
    ADD CONSTRAINT tbl_business_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tbl_business_categories(id) ON DELETE CASCADE;
 p   ALTER TABLE ONLY public.tbl_business_subcategories DROP CONSTRAINT tbl_business_subcategories_category_id_fkey;
       public          postgres    false    3579    260    262            	           2606    49665 :   tbl_delivery_addresses tbl_delivery_addresses_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_delivery_addresses
    ADD CONSTRAINT tbl_delivery_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 d   ALTER TABLE ONLY public.tbl_delivery_addresses DROP CONSTRAINT tbl_delivery_addresses_user_id_fkey;
       public          postgres    false    228    210    3517            �           2606    32861 ,   tbl_device_info tbl_device_info_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_device_info
    ADD CONSTRAINT tbl_device_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 V   ALTER TABLE ONLY public.tbl_device_info DROP CONSTRAINT tbl_device_info_user_id_fkey;
       public          postgres    false    210    212    3517                       2606    49806 2   tbl_notifications tbl_notifications_sender_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_notifications
    ADD CONSTRAINT tbl_notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 \   ALTER TABLE ONLY public.tbl_notifications DROP CONSTRAINT tbl_notifications_sender_id_fkey;
       public          postgres    false    210    3517    240                       2606    49801 0   tbl_notifications tbl_notifications_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_notifications
    ADD CONSTRAINT tbl_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 Z   ALTER TABLE ONLY public.tbl_notifications DROP CONSTRAINT tbl_notifications_user_id_fkey;
       public          postgres    false    210    3517    240                       2606    57412 F   tbl_offer_subcategories tbl_offer_subcategories_offer_category_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_offer_subcategories
    ADD CONSTRAINT tbl_offer_subcategories_offer_category_id_fkey FOREIGN KEY (offer_category_id) REFERENCES public.tbl_offer_categories(id) ON DELETE CASCADE;
 p   ALTER TABLE ONLY public.tbl_offer_subcategories DROP CONSTRAINT tbl_offer_subcategories_offer_category_id_fkey;
       public          postgres    false    256    258    3575                       2606    49646 9   tbl_offer_valid_times tbl_offer_valid_times_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_offer_valid_times
    ADD CONSTRAINT tbl_offer_valid_times_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.tbl_offers(id) ON DELETE CASCADE;
 c   ALTER TABLE ONLY public.tbl_offer_valid_times DROP CONSTRAINT tbl_offer_valid_times_offer_id_fkey;
       public          postgres    false    224    3539    226                       2606    49620 "   tbl_offers tbl_offers_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_offers
    ADD CONSTRAINT tbl_offers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 L   ALTER TABLE ONLY public.tbl_offers DROP CONSTRAINT tbl_offers_user_id_fkey;
       public          postgres    false    3517    210    224                        2606    41031    tbl_otp tbl_otp_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_otp
    ADD CONSTRAINT tbl_otp_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 F   ALTER TABLE ONLY public.tbl_otp DROP CONSTRAINT tbl_otp_user_id_fkey;
       public          postgres    false    216    3517    210                       2606    49231 &   tbl_payments tbl_payments_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_payments
    ADD CONSTRAINT tbl_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.tbl_payments DROP CONSTRAINT tbl_payments_user_id_fkey;
       public          postgres    false    220    210    3517                       2606    49827 5   tbl_recently_viewed tbl_recently_viewed_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_recently_viewed
    ADD CONSTRAINT tbl_recently_viewed_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.tbl_offers(id) ON DELETE CASCADE;
 _   ALTER TABLE ONLY public.tbl_recently_viewed DROP CONSTRAINT tbl_recently_viewed_offer_id_fkey;
       public          postgres    false    242    224    3539                       2606    49822 4   tbl_recently_viewed tbl_recently_viewed_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_recently_viewed
    ADD CONSTRAINT tbl_recently_viewed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 ^   ALTER TABLE ONLY public.tbl_recently_viewed DROP CONSTRAINT tbl_recently_viewed_user_id_fkey;
       public          postgres    false    3517    242    210                       2606    49709 L   tbl_redemption_deliveries tbl_redemption_deliveries_delivery_address_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_redemption_deliveries
    ADD CONSTRAINT tbl_redemption_deliveries_delivery_address_id_fkey FOREIGN KEY (delivery_address_id) REFERENCES public.tbl_delivery_addresses(id) ON DELETE SET NULL;
 v   ALTER TABLE ONLY public.tbl_redemption_deliveries DROP CONSTRAINT tbl_redemption_deliveries_delivery_address_id_fkey;
       public          postgres    false    228    232    3543                       2606    49704 F   tbl_redemption_deliveries tbl_redemption_deliveries_redemption_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_redemption_deliveries
    ADD CONSTRAINT tbl_redemption_deliveries_redemption_id_fkey FOREIGN KEY (redemption_id) REFERENCES public.tbl_redemptions(id) ON DELETE CASCADE;
 p   ALTER TABLE ONLY public.tbl_redemption_deliveries DROP CONSTRAINT tbl_redemption_deliveries_redemption_id_fkey;
       public          postgres    false    230    3545    232                       2606    49687 -   tbl_redemptions tbl_redemptions_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_redemptions
    ADD CONSTRAINT tbl_redemptions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.tbl_offers(id) ON DELETE CASCADE;
 W   ALTER TABLE ONLY public.tbl_redemptions DROP CONSTRAINT tbl_redemptions_offer_id_fkey;
       public          postgres    false    230    224    3539            
           2606    49682 ,   tbl_redemptions tbl_redemptions_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_redemptions
    ADD CONSTRAINT tbl_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 V   ALTER TABLE ONLY public.tbl_redemptions DROP CONSTRAINT tbl_redemptions_user_id_fkey;
       public          postgres    false    3517    230    210                       2606    49933 <   tbl_report_voice_notes tbl_report_voice_notes_report_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_report_voice_notes
    ADD CONSTRAINT tbl_report_voice_notes_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.tbl_reports(id) ON DELETE CASCADE;
 f   ALTER TABLE ONLY public.tbl_report_voice_notes DROP CONSTRAINT tbl_report_voice_notes_report_id_fkey;
       public          postgres    false    3565    250    252                       2606    49917 &   tbl_reports tbl_reports_reason_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.tbl_report_reasons(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_reason_id_fkey;
       public          postgres    false    248    3563    250                       2606    49912 .   tbl_reports tbl_reports_reported_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_reported_offer_id_fkey FOREIGN KEY (reported_offer_id) REFERENCES public.tbl_offers(id) ON DELETE CASCADE;
 X   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_reported_offer_id_fkey;
       public          postgres    false    3539    224    250                       2606    49907 -   tbl_reports tbl_reports_reported_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 W   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_reported_user_id_fkey;
       public          postgres    false    210    250    3517                       2606    49902 (   tbl_reports tbl_reports_reporter_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reports
    ADD CONSTRAINT tbl_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 R   ALTER TABLE ONLY public.tbl_reports DROP CONSTRAINT tbl_reports_reporter_id_fkey;
       public          postgres    false    3517    250    210                       2606    49733 (   tbl_reviews tbl_reviews_business_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reviews
    ADD CONSTRAINT tbl_reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 R   ALTER TABLE ONLY public.tbl_reviews DROP CONSTRAINT tbl_reviews_business_id_fkey;
       public          postgres    false    3517    234    210                       2606    49738 %   tbl_reviews tbl_reviews_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reviews
    ADD CONSTRAINT tbl_reviews_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.tbl_offers(id) ON DELETE SET NULL;
 O   ALTER TABLE ONLY public.tbl_reviews DROP CONSTRAINT tbl_reviews_offer_id_fkey;
       public          postgres    false    3539    234    224                       2606    49728 $   tbl_reviews tbl_reviews_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_reviews
    ADD CONSTRAINT tbl_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 N   ALTER TABLE ONLY public.tbl_reviews DROP CONSTRAINT tbl_reviews_user_id_fkey;
       public          postgres    false    210    234    3517                       2606    49782 /   tbl_saved_offers tbl_saved_offers_offer_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_saved_offers
    ADD CONSTRAINT tbl_saved_offers_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.tbl_offers(id) ON DELETE CASCADE;
 Y   ALTER TABLE ONLY public.tbl_saved_offers DROP CONSTRAINT tbl_saved_offers_offer_id_fkey;
       public          postgres    false    3539    224    238                       2606    49777 .   tbl_saved_offers tbl_saved_offers_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_saved_offers
    ADD CONSTRAINT tbl_saved_offers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 X   ALTER TABLE ONLY public.tbl_saved_offers DROP CONSTRAINT tbl_saved_offers_user_id_fkey;
       public          postgres    false    3517    238    210                       2606    49258 9   tbl_user_memberships tbl_user_memberships_payment_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_memberships
    ADD CONSTRAINT tbl_user_memberships_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.tbl_payments(id) ON DELETE SET NULL;
 c   ALTER TABLE ONLY public.tbl_user_memberships DROP CONSTRAINT tbl_user_memberships_payment_id_fkey;
       public          postgres    false    222    3533    220                       2606    49253 6   tbl_user_memberships tbl_user_memberships_plan_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_memberships
    ADD CONSTRAINT tbl_user_memberships_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.tbl_membership_plans(id) ON DELETE CASCADE;
 `   ALTER TABLE ONLY public.tbl_user_memberships DROP CONSTRAINT tbl_user_memberships_plan_id_fkey;
       public          postgres    false    3531    222    218                       2606    49248 6   tbl_user_memberships tbl_user_memberships_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_memberships
    ADD CONSTRAINT tbl_user_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 `   ALTER TABLE ONLY public.tbl_user_memberships DROP CONSTRAINT tbl_user_memberships_user_id_fkey;
       public          postgres    false    3517    210    222                       2606    49854 0   tbl_user_settings tbl_user_settings_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_settings
    ADD CONSTRAINT tbl_user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 Z   ALTER TABLE ONLY public.tbl_user_settings DROP CONSTRAINT tbl_user_settings_user_id_fkey;
       public          postgres    false    3517    210    244                       2606    49761 >   tbl_user_subscriptions tbl_user_subscriptions_business_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_subscriptions
    ADD CONSTRAINT tbl_user_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 h   ALTER TABLE ONLY public.tbl_user_subscriptions DROP CONSTRAINT tbl_user_subscriptions_business_id_fkey;
       public          postgres    false    210    236    3517                       2606    49756 :   tbl_user_subscriptions tbl_user_subscriptions_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.tbl_user_subscriptions
    ADD CONSTRAINT tbl_user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.tbl_users(id) ON DELETE CASCADE;
 d   ALTER TABLE ONLY public.tbl_user_subscriptions DROP CONSTRAINT tbl_user_subscriptions_user_id_fkey;
       public          postgres    false    3517    210    236            �   +  x���;o�0����+�W��� [oQ�^:vq�)nm@�\���d�IW��{Az�0�[�EGr�T}ߚ��Ł�V	�7�g����x?���d���B�.]��q�Yy)Mh����������O�'�{�Iߐ�WM�p�<��n[X<7Jl y+�d��Z:vܭ���M��]��Se�b����NJ�������@E���-�H-{Q��q�Z"vܭa�������n�U�k\	l3�����5�րRx�k�W��j@EznP�2[c
(ld�yd~�S���i�F��9����      �   .  x��ӱn�0����X*��ـ��D��tq���/�x���]��ҧ��~�0o�.ĦC`��B�PN��yݔe#g�i9�����'Y5��
X�@,�C�N�������&�&�q�tso^uhc�-�����+X�jcȁأ�K�<��%>ǹ#=�C ozX�6�,�#��ֺ'�5�[�ǍF�5�ds+��=9���V�V+6��W1�;��9��9Dt������=>ȹ3e{KX(��ۦ���N/i>�]P�wF�Pμ�Q�+���+}k���O`�g��@�,�~ "�.�      �   1  x����r�6���S`�M�爐�d�Nc%˓l��IHĘTp���}�>I�CY�f���x��~���DI��N,�٫�G�(���]\��b����C<{_ee��?�Ň,��.R`���b-����+t�^�(�Q�E7����~���A�d�i�܁�\���޺���l�-A��U�n\�ŭ�4zP���I��ԅ�n���=v�\>+�����8��b�i:q�d�&��-�ǡ͎;��4ʢ��{�<l"���e<>�/��l$9��Ҵl�( \�aP�Ѳ��K�����z��T��m�QW����c��d�n�Y\y�d�5#�f��l��й1H/�`�g�v�4��'��їr��A\�./�1PҔE���{�DLv�bgQ�I��`)��������o��i�S�^;�농_��Y���y�s�Ŵ��\�'X����Yf/)r���7jdC�Q����?G���L��b���f�����Ns�t`�'�/��ߕt\�̹�љ��hg�,}��6j*2N�0]��w��C�o������`�`�"���ƽ��D�׆/����ju�͜�Y���}�Z��Б���kp�j��;��hu^h�hC÷͠��~b�ɬԀ�6v����1�>���:��5Fb�+���������Xg�l��S�U���~�T��/�'M�g�Ur�|�nav~vA��[�I�^����
7�|m ��Y����Κ)��S�7�5���c^���a0���g�/$V�i|Xw�[t�}���C�����]�H���!���^s��"�*�ڒW��a������OL�|'�	��u�`���b�(�>����Zz��'��(Ic�t�{����3PEx,�� wJ�cv3���~�N+�nu�[`%	F}��(n~z?-����#z�W��dN�w ��Z|u�LH�4D,z9����f4Y����|���E�c{�νC֚�3�0^(?w�?^�,(��)/�洓g��3Vy�O�8Ϋ����N2�4|1��>���}ǿ{�H��y~�'�*&�͏�C-d��Q%D�h�0-�b�K�w�*%6�-L�T���*�q~�)V�E^�<'���u�i�U���U�W��8om0	��q�K�/���k]��/P�ƭt�2o�H�"z���.�����cG�1#n.��<��eϰ:&��~�ׄMc-=��>���$a%K��t6|J��toQ�j�p�[z˙�QSY��gp����.L�V��Q�	�IG�Kq��9�,��W���G	��a�X$�"�}�z�G���47Rп�V|�j`ә��-m�(�j�;3�����
ޯ�/..���l      �   �   x��ѻ�0 ��}
_ BK)�Vm	�"�(jL���Q4������ɷX4�&bȲү4�O͊�uR�A0������5 �a��=�|��mˤ.�mI>�¹L���w�����9!>�L���Z�i!E�R�T�"1)�y��Ŝ�,a&���R�J?�r��$�b��{ˮ>�Ey<��ք�qMo&      �   7  x��ӻn�0���S��Ŏ�lܤ�"P��#"�$
Է���Ԋ��Ǌ���	`<�U^ִ�jX��Q�~����N�)��T�� &'�H3�Zm_R���@�,����Bӻ��P���/��OjT�Ц�m�
�Im�*�h�n�-�ϰ˾�eR�ݵ�������*)�鶕�E�!�j�1,�
�5���;z�1%x�u���h�>jiiVv�3ͪ{�!"�m�knu3��Դ/��y�>��3"�n�-ﮋ����i�v���y�gB�]�տJ4���o�M���iSa�+l���>��$�Q�S      �   �  x���[s�H���W�}J�/44�!��!F@M�*� �Mј�ןv.�:������WU���Z�	H���nW���V���N��e^���цnf��3�L[���,4M�"�������*c'ѦLW\���|�c�٤�^fi�5�{Z�� ?o��d:CV/4�Y��Hm�ijo7�n�aS��3���O��<��u��`l�,Z����b^�»� �j*w�@�!� 
�~D��?"��p�3�����3��� �^���
d�W˸I�-P�x�>������W���JX}����O�2��K4.	DY ��1�҈ ˃�K�ز�['���Z��I5E�Ԝ�L{����?��G�6�R����;4aI���K��-i�%%B̷�ޤKc�ݜNcl>��y�5�����7�l���sT��1���+���e�X�I`L�h\��RV��$�P+I��⏳����q��v}�<�nxz8�P��&��7���)I����UJ���/O�y �{c�{��?˧�en�:Y§�O�J����4��"���������;u��O� Q(���"U���[5�$E���^���R,na�y����������f@��	XKI��`�8T^�fm,{U���Q<�3���>�_�==�D� !��6�"���rC��DG�eI��n.�	DM����ot�а�Ѹ��FKv� z�@b�[˯��t�ߘ�2��G9U�5�1�}mg����]�媺LtB%����W"��M�Xg@�|}��b��Y3d������y�q>,��1T��i�%�Lm5�FMo��/?c��:�$�B�lp_����Ϸπx�9f��s����[�Zu�T�=ǫ�?IguyH����!_�h;�����n �c���0�g�"H�(�F��      �   v   x�3�t*�ϫJ�4�30�463�4R�ipX�i@Q#S]s]#cC3+c+cc=SCsCcmS ��.#��̜��"NCS�U�� �P�.cN�����0�b�8-��# 5,����� �@�      �      x������ � �      �   h   x�3�L*�TH�KQHO-Q�OKK-*������b�1���t��4N##S]s]cCs+CS+#=3#KmS+cB�\F���ə�9pˠ|j[���� �}8@      �   �   x���=�0@��9Evh�IQ� ]�*�R�ܞ]2����7<���ոէ�4��#�gHp2�*�+6}˶5MM�xc\��o���I��ga�.<�3Ǖ���������u��J^zξ��`n��g�E����1�d��$g��4|�w��Z)�Y�S      �   �   x���A
1E�z�ٗ	~�I�Y��	z���J��i!	��S8�HZ��GУxѓT�w�����!-I�����d`TB��n��t�9K��gF��T�_��p_�/�7�/.c��x�a%kn�A?�ʠ�����:��~��:�����>�꠯ݯ������~      �   |  x�ݓ=O�0�g�Wxa��w�H�HlS���K�FI���zlZQѦ0TH����=�+��Q����(2뺺�á}7e]X�-ʡ+�Բy=%IrE'��h�|]�5�w��lN�]i�d� NMS���6��䮚/�4�>�˖�n�1�ttf�	�f�֍�,#/�p�?^�C���o�Y��(` ��g�� �`H ��O�SR��U�ζ>�� �O)r��!e�5(-`��|ԧb�#r�&�����T��1U6Ûm�d�����N�	L�Y�.�P�!�/��4*6��Ǳz.�}G)!���W�
8Ŀ�!���\j�X�4����8�SB�8Uy#��F#���^�gWm|�h(�I����4��si�;�X$=4�
�1���]L�p      �   U  x����n!�5|E�U�K׍�i�>��d��@]��\��H���r  9���`��^@�!���N�G��eGYKw����ͪ7Ix@u���p�wE�A�!o��`���VGp*���}��>~?;�fq�T����q����gv�D���u��h�<(c�9A�yQa�ߎ��<0;S2��D�֡�'ʎ�UY�;�y6�D�>Yu�Vy���L[G;�<�pƄդ���(d6&�}�T��K�m��i:�Dj5�P�[>��Rۇ%���qCxE�� �j�v3�x��ն��s�d��qC�#f�_��b���c��(�      �   �   x����
�0E痯p��佄�:;��[��$b��P3���jѭN�/�s)P�d��an�K�������R*p�!�!��0��x�t�%�BV�25rm�Db�i+MM��@��5�q���>>��w��&�A5���t>�~�W������3+4����}      �      x������ � �      �      x������ � �      �      x������ � �      �   �   x��ӱn�0��<��(�1��lR�C�J���0G8l�6Q��E"e�r�/�����\L�x��}p>$��p#D��J�[u����c��E��U��z��������ad�E|�o�`��lb���u�L�)-٫$۹0B"g�J�G���)`ˤ>=ԋK�l1�@�4��Mo�� )�	��j���gD��_����^.�u�\��[��u�vY������      �   _   x���A
�  �������[�H	�B=��u�����#h�����\���M*W�`ђ�Qڡ3��)���{|���?~C�Ϥ�7�1%_      �   m   x�3��t�v�500�44���������\Ns�(�8?�,5*W�id`d�k`�kd�`hjeldel�gi`a`a�m �T�e����^0'5/%3/�����qqq \69      �      x������ � �      �      x������ � �      �   Q  x���Mo�0���W�>�J��qCHM����bZwDk��P�����K.v�Dz��@'<�c�7�=k�}M�X��%݁�<�g�l>̧8��&�j2-�E�X�eRg�>���6�1������
�'���K$]��.�WF�$�h��R���;���Jʝ���,�5cyK�Dt
]`�~���KW��}r�R�tt3�<����8�H�Z��!��=��na'7���m��X�"4Ң��Dl�*���G��Q9O��$J�i�V"��=�CP%�J���P���Xl�zU�6�
��VV�'?������if7�d�9ـ��T�JT��}4� R      �     x���Kn� �5���Ȉ��"'�uN��+8����X�@^V��$l(2�oÞe�igl�*��˩|y��G�)���M z��,����a��Q��2.c�L-���ߙ,ˁ���V�ҡb�p���<+,S�� �Gc�U�6�<��@E~����ʹv\�7���r.�2\�I�"L8���I�*�O5Ϋ#��2���c�:�KU��IuM�[���c�J"ӥ�������5C���EQ��*ť��9}*��A:g(؇���801      �   Z   x�3�44�,�S�D�����������������������������o@P�1N��d�)Ȇ4Z���2K�d�%.?�RɆ=... ��d�      �      x������ � �      �   +  x�ŖK��H�����C�&��7�Ӫ�߶��<EE?������v�a]�H��<�/럙�+Q��7��*0=X����>�6v��R��7\��	ݍ���|����Cwԁ�r������W&�q����]F�7#_���l��ى�W�����;�{��r�&\U⟞���[��(� �ar!��|�L!�s�7�ހQa﹅�U]�6C}ہ3'iT��d�DQ��	�㎌Xܶ/�xګsS�Vf97������D�� BD,��R������޳���Q��,R�Ӟ_�v�{K��dw��{m���EU����:��^��g�L� )dR	{�C�.ޘIa�מ����tf�E�ׄ�
:�r����.����7u"Ѫvr1�쎫?L��7��a� QY��=w� *�(�LP��ҍ�fO�SR��9L�c����f?�W�h�N�{�[}����9��ij{������B�B��S�E^�^ꐡ�Y.�=x�����voתF1a�'}]m�A���e�G���H7i.u!��߃c��/P�c'_K�:��H�<0ƀ��bsu4�[t�6co�e;�Gf��>M%&yq�K���Tb��(��T��W�P ��e�DD�пX�=���8����猉7aX:%�A���.|�����D$��+,3��{�71C�)����
pV|�$6��ń���`��>�x�,���:�&gm'�i��H�E@�ݳ��/��V��IR��/���9�R>��8��/��s~X��Z>��pҫ{�e����jG�j��~G�[-Ҏ��:iy<�f�������%F��)S�d*K��#��hű���|8�0<8�\�z��&����Y��ؚ��WinO����)��o_���<�De�!*�I&�e��!�Pq�(&�x�Jm�u]b�a3:{����v ��C��tS�\}]n-�G���B/�ѣf/�?g��S��w|萃���R� ҩ+O��u)�����m��֫ś�W�dNuJE��~�j�:��4��<+����,��%��xzz���R�     