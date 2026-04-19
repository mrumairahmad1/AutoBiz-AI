--
-- PostgreSQL database dump
--


-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.postatus AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.postatus OWNER TO postgres;

--
-- Name: roleenum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.roleenum AS ENUM (
    'admin',
    'manager',
    'viewer'
);


ALTER TYPE public.roleenum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    name character varying NOT NULL,
    sku character varying NOT NULL,
    quantity integer,
    reorder_point integer,
    reorder_quantity integer,
    unit_cost double precision,
    holding_cost double precision,
    ordering_cost double precision,
    supplier character varying,
    supplier_lead_days integer
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_id_seq OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying,
    quantity integer
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    product character varying NOT NULL,
    sku character varying NOT NULL,
    quantity integer NOT NULL,
    unit_cost double precision NOT NULL,
    total_cost double precision NOT NULL,
    supplier character varying,
    status public.postatus NOT NULL,
    requested_by character varying,
    approved_by character varying,
    notes character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    product character varying NOT NULL,
    sku character varying,
    quantity integer NOT NULL,
    amount double precision NOT NULL,
    category character varying,
    sale_date timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_id_seq OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    hashed_password character varying NOT NULL,
    role public.roleenum NOT NULL,
    otp_code character varying,
    otp_expires_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.inventory VALUES (204, 'Headphones', 'SKU-2', 10, 10, 50, 50, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (205, 'Keyboard', 'SKU-3', 7, 10, 50, 30, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (206, 'Mouse', 'SKU-4', 12, 10, 50, 20, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (207, 'Monitor', 'SKU-5', 3, 10, 50, 200, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (208, 'Tablet', 'SKU-6', 4, 10, 50, 300, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (209, 'Printer', 'SKU-7', 2, 10, 50, 150, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (210, 'Desk', 'SKU-8', 1, 10, 50, 250, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (211, 'Chair', 'SKU-9', 6, 10, 50, 100, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (202, 'Laptop', 'SKU-0', 1, 10, 50, 800, 1, 50, NULL, 7);
INSERT INTO public.inventory VALUES (203, 'Phone', 'SKU-1', 3, 10, 50, 500, 1, 50, NULL, 7);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.products VALUES (1, 'Laptop', 20);
INSERT INTO public.products VALUES (2, 'Mouse', 50);
INSERT INTO public.products VALUES (3, 'Keyboard', 30);


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.purchase_orders VALUES (1, 'cv', 'sdf', 23, 23, 529, '23456', 'approved', 'CEO@test.com', 'CEO@test.com', 'ok', '2026-04-12 15:30:48.250835+05', '2026-04-16 17:34:39.520589+05');


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sales VALUES (126, 'Phone', 'SKU-1', 2, 4, NULL, '2026-04-19 07:46:53.353619+05');
INSERT INTO public.sales VALUES (113, 'Laptop', NULL, 2, 0, 'Electronics', '2026-04-01 00:00:00+05');
INSERT INTO public.sales VALUES (114, 'Phone', NULL, 5, 0, 'Electronics', '2026-04-02 00:00:00+05');
INSERT INTO public.sales VALUES (115, 'Headphones', NULL, 10, 0, 'Accessories', '2026-04-03 00:00:00+05');
INSERT INTO public.sales VALUES (116, 'Keyboard', NULL, 7, 0, 'Accessories', '2026-04-04 00:00:00+05');
INSERT INTO public.sales VALUES (117, 'Mouse', NULL, 12, 0, 'Accessories', '2026-04-05 00:00:00+05');
INSERT INTO public.sales VALUES (118, 'Monitor', NULL, 3, 0, 'Electronics', '2026-04-06 00:00:00+05');
INSERT INTO public.sales VALUES (119, 'Tablet', NULL, 4, 0, 'Electronics', '2026-04-07 00:00:00+05');
INSERT INTO public.sales VALUES (120, 'Printer', NULL, 2, 0, 'Electronics', '2026-04-08 00:00:00+05');
INSERT INTO public.sales VALUES (121, 'Desk', NULL, 1, 0, 'Furniture', '2026-04-09 00:00:00+05');
INSERT INTO public.sales VALUES (122, 'Chair', NULL, 6, 0, 'Furniture', '2026-04-10 00:00:00+05');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (6, 'manager@test.com', '$2b$12$TZnrP/5xLO10t7pyvSQSie.C.a44Tv8Cqe.l2GVhvI8K9nLMTnzzi', 'manager', NULL, NULL);
INSERT INTO public.users VALUES (5, 'CEO@test.com', '$2b$12$QUstS1aRgqCcSC2cxClDmO5N76SrSh3.jIXi0K.8Um4SVSG5UmSPu', 'admin', NULL, NULL);
INSERT INTO public.users VALUES (3, 'umairhafiz0@gmail.com', '$2b$12$RZjOsKRtioHQzSeAU1v/tu7GFNOcxYtBRJoQScDhm2UQ2d2lXmzqe', 'admin', NULL, NULL);
INSERT INTO public.users VALUES (7, 'ranabilal8359@gmail.com', '$2b$12$AFQ4LYUN87D4RmHyIlrGd.9FnEW4ZG3aaXplok628zZ77q.QR.Iy6', 'admin', '$2b$12$xgRQ892820aiM5XguBCJ3.jh2jEdu3YD5OA08/43js0KAOxSf8APq', '2026-04-19 07:20:43.802257');


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 213, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 3, true);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_seq', 126, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_inventory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_inventory_id ON public.inventory USING btree (id);


--
-- Name: ix_products_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_products_id ON public.products USING btree (id);


--
-- Name: ix_purchase_orders_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_purchase_orders_id ON public.purchase_orders USING btree (id);


--
-- Name: ix_sales_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_id ON public.sales USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- PostgreSQL database dump complete
--

\unrestrict MtehYfFbIobJ8RWSvGABZOzaXYnxRWMKcd0XEI0I2ULAFpLhG0k3LVKmdh15Mde

