export class CertificateIssuedEvent {
  constructor(
    public readonly enrolmentId: string,
    public readonly employeeId: string,
    public readonly employeeName: string,
    public readonly courseId: string,
    public readonly courseTitle: string,
  ) {}
}