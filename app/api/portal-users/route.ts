import { NextResponse, type NextRequest } from "next/server";
import {
  fetchPortalClientUserRecordByEmail,
  fetchPortalClientUserRecordByUsername,
  fetchPortalClientUsers,
  fetchPortalReceiverByCode,
  upsertPortalClientUserRecord,
} from "@/lib/clickhouse";
import { requireAdminApiUser, requireValidCsrfToken } from "@/lib/auth";
import {
  createPortalClientUserRecord,
  mapPortalClientUserRecordToView,
  parsePortalClientUserCreateInput,
  PortalUserValidationError,
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

  console.error("Portal users API error", error);

  return NextResponse.json(
    {
      message:
        "No fue posible procesar la operacion contra ClickHouse. Revisa la tabla PortalClientUsers y las credenciales.",
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApiUser(request);

    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const items = await fetchPortalClientUsers({
      q: searchParams.get("q"),
      recipientCode: searchParams.get("recipientCode"),
      status: searchParams.get("status") as
        | "Activo"
        | "Pendiente"
        | "Bloqueado"
        | null,
    });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    return handlePortalUserApiError(error);
  }
}

export async function POST(request: NextRequest) {
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

    const payload = await request.json();
    const input = parsePortalClientUserCreateInput(payload);
    const [existingByUsername, existingByEmail] = await Promise.all([
      fetchPortalClientUserRecordByUsername(input.username),
      fetchPortalClientUserRecordByEmail(input.email),
    ]);

    if (existingByUsername) {
      return NextResponse.json(
        { message: "Ya existe un usuario con ese username." },
        { status: 409 },
      );
    }

    if (existingByEmail) {
      return NextResponse.json(
        { message: "Ya existe un usuario con ese email." },
        { status: 409 },
      );
    }

    let normalizedInput = input;

    if (!input.canViewAll) {
      const receiver = await fetchPortalReceiverByCode(
        input.recipientCode ?? "",
      );

      if (!receiver) {
        return NextResponse.json(
          {
            message:
              "El recibidor seleccionado no existe en PortalClientes.RECIBIDORES.",
          },
          { status: 400 },
        );
      }

      normalizedInput = {
        ...input,
        recipientCode: receiver.code,
        recipientName: receiver.name,
      };
    }

    const record = createPortalClientUserRecord(normalizedInput);
    await upsertPortalClientUserRecord(record);

    return NextResponse.json(
      { item: mapPortalClientUserRecordToView(record) },
      { status: 201 },
    );
  } catch (error) {
    return handlePortalUserApiError(error);
  }
}
