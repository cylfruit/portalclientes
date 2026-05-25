import { NextResponse, type NextRequest } from "next/server";
import {
  fetchPortalClientUserRecordByEmail,
  fetchPortalClientUserRecordById,
  fetchPortalReceiverByCode,
  fetchPortalClientUserRecordByUsername,
  upsertPortalClientUserRecord,
} from "@/lib/clickhouse";
import { requireAdminApiUser, requireValidCsrfToken } from "@/lib/auth";
import {
  mapPortalClientUserRecordToView,
  parsePortalClientUserUpdateInput,
  PortalUserValidationError,
  updatePortalClientUserRecord,
} from "@/lib/portal-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handlePortalUserApiError(error: unknown) {
  if (error instanceof PortalUserValidationError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.statusCode },
    );
  }

  console.error("Portal user detail API error", error);

  return NextResponse.json(
    {
      message:
        "No fue posible procesar la operacion sobre el usuario en ClickHouse.",
    },
    { status: 500 },
  );
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminApiUser(request);

    if (auth.response) {
      return auth.response;
    }

    const { userId } = await context.params;
    const record = await fetchPortalClientUserRecordById(userId);

    if (!record) {
      return NextResponse.json(
        { message: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ item: mapPortalClientUserRecordToView(record) });
  } catch (error) {
    return handlePortalUserApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminApiUser(request);

    if (auth.response) {
      return auth.response;
    }

    const csrfResponse = requireValidCsrfToken(
      request,
      request.headers.get("x-csrf-token"),
    );

    if (csrfResponse) {
      return csrfResponse;
    }

    const { userId } = await context.params;
    const current = await fetchPortalClientUserRecordById(userId);

    if (!current) {
      return NextResponse.json(
        { message: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    const payload = await request.json();
    const update = parsePortalClientUserUpdateInput(payload);
    let normalizedUpdate = update;

    if (update.username && update.username !== current.username) {
      const existingByUsername = await fetchPortalClientUserRecordByUsername(
        update.username,
      );

      if (existingByUsername) {
        return NextResponse.json(
          { message: "Ya existe un usuario con ese username." },
          { status: 409 },
        );
      }
    }

    if (update.email && update.email !== current.email) {
      const existingByEmail = await fetchPortalClientUserRecordByEmail(
        update.email,
      );

      if (existingByEmail) {
        return NextResponse.json(
          { message: "Ya existe un usuario con ese email." },
          { status: 409 },
        );
      }
    }

    const nextRoleKey = update.roleKey ?? current.roleKey;
    const nextCanViewAll =
      nextRoleKey === "superuser" || (update.canViewAll ?? current.canViewAll);

    if (!nextCanViewAll) {
      const nextRecipientCode =
        update.recipientCode !== undefined
          ? update.recipientCode
          : current.recipientCode;
      const receiver = await fetchPortalReceiverByCode(nextRecipientCode ?? "");

      if (!receiver) {
        return NextResponse.json(
          {
            message:
              "El recibidor seleccionado no existe en PortalClientes.RECIBIDORES.",
          },
          { status: 400 },
        );
      }

      normalizedUpdate = {
        ...update,
        recipientCode: receiver.code,
        recipientName: receiver.name,
      };
    }

    const updatedRecord = updatePortalClientUserRecord(
      current,
      normalizedUpdate,
    );
    await upsertPortalClientUserRecord(updatedRecord);

    return NextResponse.json({
      item: mapPortalClientUserRecordToView(updatedRecord),
    });
  } catch (error) {
    return handlePortalUserApiError(error);
  }
}
