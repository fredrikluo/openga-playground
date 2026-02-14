import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { organizationRepository, userOrganizationRepository, kahootRepository, folderRepository, groupRepository } from '@/lib/repositories';
import { syncOrgDeleted } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const organization = await organizationRepository.getById(id);
    if (!organization) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json(organization);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    const found = await organizationRepository.updateName(id, name);
    if (!found) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ id, name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const orgMembers = await userOrganizationRepository.getMemberUserIds(id);

    const info = await db.transaction(async () => {
      const org = await organizationRepository.getById(id);
      if (!org) {
        return { changes: 0 };
      }

      await kahootRepository.deleteByOrganization(id);
      await organizationRepository.clearRootFolder(id);
      await folderRepository.deleteByOrganization(id);
      await groupRepository.deleteByOrganization(id);
      await organizationRepository.delete(id);
      return { changes: 1 };
    });

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    await syncOrgDeleted(id, orgMembers);

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
