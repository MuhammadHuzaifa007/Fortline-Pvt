import { POST as handlePost } from '../route';

export async function POST(
  request: Request,
  context: { params: Promise<{ event?: string[] }> }
) {
  return handlePost(request, context);
}
