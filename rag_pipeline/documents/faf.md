# FAF (Full Automation Framework)

> PLACEHOLDER CONTENT — replace with real details once available from the team.
> Some context inferred from the LDD_University_Connect.xlsx template (FAFCNF,
> AnyCloud Tenant, CaaS resources) — confirm accuracy with the team.

## What it is
FAF (Full Automation Framework) is a fully automated testing framework that covers
end-to-end test execution, typically deployed on cloud-native infrastructure
(referred to as FAFCNF — FAF Cloud Native Function) running on a platform like
AnyCloud.

## When to use it
Used for comprehensive, repeatable, end-to-end testing where full coverage and
minimal manual intervention are required — e.g. ongoing regression testing or
large-scale validation.

## Key features
- Full automation, no manual steps required during execution
- Deployed via cloud-native infrastructure (AnyCloud Tenant, CaaS resources)
- Supports subscriber-level and network-level test configuration
- Requires defined networking (VLANs, subnets), resource allocation (vCPU, RAM,
  storage), and access credentials

## Requirements / prerequisites
- AnyCloud Tenant setup (namespace, admin credentials)
- Networking configuration (VLANs, subnets, gateways)
- Defined pod resources (CPU, memory, storage)
- Subscriber details (IMSI, IMEI, MSISDN, UE model) for test scenarios
- Hardware inventory and power requirements documented (see LDD template)

## How it differs from MT and SAF
FAF is the most comprehensive of the three — full test coverage with full automation,
compared to SAF's sanity-only automation and MT's fully manual approach. FAF also
requires the most setup (infrastructure, networking, resources) before it can run.
