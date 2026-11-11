import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "./skinaoAuth.server";
import { neonTransport } from "./skinaoNeonTransport.server";
import { staffEmailSchema, staffPasswordSchema, staffIdSchema, STAFF_LIMIT } from "./skinaoTeamRules";

/**
 * The principal administrator is the only person able to manage staff.
 * Passwords never leave this function and are hashed inside PostgreSQL with
 * pgcrypto/bcrypt. The UI only receives safe account metadata.
 */
type AccountRow = Record<string, unknown>;

export type TeamMember = {
  id:string;
  username:string;
  role:"owner"|"staff";
  is_active:boolean;
  created_at:string;
  last_login_at:string|null;
};

function toTeamMember(row:AccountRow):TeamMember {
  return {
    id:String(row.id),
    username:String(row.username),
    role:row.role === "owner" ? "owner" : "staff",
    is_active:row.is_active === true,
    created_at:String(row.created_at),
    last_login_at:row.last_login_at ? String(row.last_login_at) : null,
  };
}

async function ensureOwner() {
  await requireOwner(process.env["SKINAO_SESSION_SECRET"]);
}

export const listTeamMembers = createServerFn({method:"GET"}).handler(async () => {
  await ensureOwner();
  const result = await neonTransport([{
    query:`SELECT id,username,role,is_active,created_at,last_login_at
           FROM skinao_admin_users
           ORDER BY CASE WHEN role='owner' THEN 0 ELSE 1 END,
                    created_at ASC,id ASC`,
  }],false);
  return { members:result[0].rows.map(toTeamMember),staffLimit:STAFF_LIMIT };
});

export const createStaffMember = createServerFn({method:"POST"})
  .inputValidator(z.object({
    email:staffEmailSchema,
    password:staffPasswordSchema,
  }))
  .handler(async ({data}) => {
    await ensureOwner();
    const count = await neonTransport([{
      query:"SELECT count(*) AS total FROM skinao_admin_users WHERE role='staff'",
    }],false);
    if (Number(count[0]?.rows[0]?.total) >= STAFF_LIMIT)
      throw new Error("O limite de funcionários cadastrados foi alcançado.");

    const result = await neonTransport([{
      query:`INSERT INTO skinao_admin_users(username,password_hash,role,is_active)
             VALUES($1,crypt($2,gen_salt('bf',12)),'staff',true)
             ON CONFLICT (username) DO NOTHING
             RETURNING id,username,role,is_active,created_at,last_login_at`,
      params:[data.email,data.password],
    }],true);

    if (!result[0]?.rows.length)
      throw new Error("Esse e-mail já possui acesso ao painel.");
    return {member:toTeamMember(result[0].rows[0])};
  });

export const setStaffActive = createServerFn({method:"POST"})
  .inputValidator(z.object({id:staffIdSchema,active:z.boolean()}))
  .handler(async ({data}) => {
    await ensureOwner();
    const result = await neonTransport([{
      query:`UPDATE skinao_admin_users
             SET is_active=$2,credential_version=credential_version+1
             WHERE id=$1 AND role='staff'
             RETURNING id,username,role,is_active,created_at,last_login_at`,
      params:[data.id,data.active],
    }],true);
    if (!result[0]?.rows.length)
      throw new Error("Funcionário não encontrado ou sem permissão para alteração.");
    return {member:toTeamMember(result[0].rows[0])};
  });

export const resetStaffPassword = createServerFn({method:"POST"})
  .inputValidator(z.object({id:staffIdSchema,password:staffPasswordSchema}))
  .handler(async ({data}) => {
    await ensureOwner();
    const result = await neonTransport([{
      query:`UPDATE skinao_admin_users
             SET password_hash=crypt($2,gen_salt('bf',12)),
                 credential_version=credential_version+1
             WHERE id=$1 AND role='staff'
             RETURNING id`,
      params:[data.id,data.password],
    }],true);
    if (!result[0]?.rows.length)
      throw new Error("Funcionário não encontrado ou sem permissão para alteração.");
    return {ok:true};
  });
