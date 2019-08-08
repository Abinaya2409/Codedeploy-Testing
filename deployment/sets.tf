# deployment sets

module "service-expose-ls" {
  source         = "../../aws-terraform-modules/modules/sets/vpc/service-exposer"
  region         = "${module.config.region}"
  environment    = "${module.config.environment_name}"
  domain         = "${local.domain}"
  domain_exposed = "ls"
  name           = "${local.name}"
  vpc_az_count   = "${module.config.vpc_az_count}"
}

output "pretty-expose-ls" {
  value = "${module.service-expose-ls.pretty}"
}
